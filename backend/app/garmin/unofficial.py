"""Unofficial Garmin adapter, backed by `garth`.

⚠️ This reverse-engineers Garmin's login. It's widely used for personal tools
but sits OUTSIDE Garmin's terms and can break when Garmin changes things. Fine
for a single-user personal app — know the trade-off.

Session handling:
  garth logs in once and caches OAuth tokens on disk (GARMIN_TOKEN_DIR). We
  resume from those tokens on each call, so we are NOT re-entering the password
  every request. When tokens expire/become invalid, calls raise GarminAuthError
  and the /garmin/reauth endpoint lets the user log in again (handling MFA).

MFA/2FA:
  If the account has MFA, the initial login needs the emailed/app code. garth
  supports a resumable login; we expose that via login_with_mfa(). For accounts
  without MFA, a plain email+password login works.
"""
from __future__ import annotations
from datetime import date, datetime, timedelta
import json
import os

from .base import GarminAdapter, GarminAuthError, GarminRateLimitError


class UnofficialGarminAdapter(GarminAdapter):
    name = "unofficial"

    def __init__(self, email: str, password: str, token_dir: str):
        self._email = email
        self._password = password
        self._token_dir = token_dir
        self._client = None  # lazily created garth client

    # ---- session management ------------------------------------------------ #
    def _garth(self):
        """Import garth lazily so the package isn't required just to import us
        (keeps tests light and the official adapter usable without garth)."""
        import garth  # noqa: WPS433 — intentional lazy import
        return garth

    def _ensure_session(self):
        """Resume from cached tokens, or do a fresh password login."""
        if self._client is not None:
            return self._client
        garth = self._garth()
        client = garth.Client()
        try:
            if os.path.isdir(self._token_dir):
                client.load(self._token_dir)          # resume cached session
            else:
                client.login(self._email, self._password)
                client.dump(self._token_dir)
        except Exception as exc:  # noqa: BLE001 — normalise to our error types
            msg = str(exc).lower()
            if "429" in msg or "rate" in msg or "too many" in msg:
                raise GarminRateLimitError(
                    "Garmin is rate-limiting logins. Wait a while and try again."
                ) from exc
            raise GarminAuthError(
                "Garmin login failed or the session expired. Re-authenticate "
                "via /garmin/reauth (MFA may be required)."
            ) from exc
        self._client = client
        return client

    def login_with_mfa(self, mfa_code: str | None = None):
        """Fresh interactive-style login that supports MFA codes.

        First call (no code) starts login and may return needs_mfa=True; the
        user submits the code on the second call. Tokens are cached on success.
        """
        garth = self._garth()
        client = garth.Client()
        try:
            if mfa_code:
                client.login(self._email, self._password, prompt_mfa=lambda: mfa_code)
            else:
                client.login(self._email, self._password)
            client.dump(self._token_dir)
            self._client = client
            return {"ok": True, "needs_mfa": False}
        except Exception as exc:  # noqa: BLE001
            if "mfa" in str(exc).lower():
                return {"ok": False, "needs_mfa": True,
                        "message": "MFA code required — resubmit with the code."}
            raise GarminAuthError(f"Garmin login failed: {exc}") from exc

    # ---- data pulls -------------------------------------------------------- #
    def get_activities(self, since: date, limit: int = 20) -> list[dict]:
        client = self._ensure_session()
        out: list[dict] = []
        try:
            raw = client.connectapi(
                f"/activitylist-service/activities/search/activities?limit={limit}&start=0"
            ) or []
            for a in raw:
                start = a.get("startTimeLocal") or a.get("startTimeGMT")
                start_dt = _parse_dt(start)
                if start_dt and start_dt.date() < since:
                    continue
                out.append({
                    "external_id": str(a.get("activityId")),
                    "activity_type": (a.get("activityType") or {}).get("typeKey", "unknown"),
                    "start_time": start_dt.isoformat() if start_dt else None,
                    "duration_s": a.get("duration"),
                    "distance_km": _m_to_km(a.get("distance")),
                    "avg_hr": _int(a.get("averageHR")),
                    "max_hr": _int(a.get("maxHR")),
                    "calories": _int(a.get("calories")),
                })
        except (GarminAuthError, GarminRateLimitError):
            raise
        except Exception as exc:  # noqa: BLE001
            raise GarminAuthError(f"Failed to fetch activities: {exc}") from exc
        return out

    def get_sleep(self, since: date) -> list[dict]:
        client = self._ensure_session()
        out: list[dict] = []
        for d in _date_range(since):
            try:
                data = client.connectapi(
                    f"/wellness-service/wellness/dailySleepData/{self._email}?date={d.isoformat()}"
                )
            except Exception:  # noqa: BLE001 — skip days that error individually
                continue
            dto = (data or {}).get("dailySleepDTO") or {}
            if not dto:
                continue
            out.append({
                "calendar_date": d.isoformat(),
                "total_sleep_h": _s_to_h(dto.get("sleepTimeSeconds")),
                "deep_h": _s_to_h(dto.get("deepSleepSeconds")),
                "rem_h": _s_to_h(dto.get("remSleepSeconds")),
                "light_h": _s_to_h(dto.get("lightSleepSeconds")),
                "awake_h": _s_to_h(dto.get("awakeSleepSeconds")),
                "sleep_score": _int(((dto.get("sleepScores") or {}).get("overall") or {}).get("value")),
            })
        return out

    def get_body_metrics(self, since: date) -> list[dict]:
        client = self._ensure_session()
        out: list[dict] = []
        try:
            end = date.today()
            data = client.connectapi(
                f"/weight-service/weight/dateRange?startDate={since.isoformat()}&endDate={end.isoformat()}"
            ) or {}
            for w in data.get("dateWeightList", []):
                out.append({
                    "calendar_date": _epoch_date(w.get("date")),
                    "weight_kg": _g_to_kg(w.get("weight")),
                    "body_fat_pct": w.get("bodyFat"),
                    "resting_hr": None,
                })
        except Exception:  # noqa: BLE001
            pass
        return out

    def get_recovery(self, since: date) -> list[dict]:
        client = self._ensure_session()
        out: list[dict] = []
        for d in _date_range(since):
            try:
                tr = client.connectapi(
                    f"/metrics-service/metrics/trainingreadiness/{d.isoformat()}"
                )
            except Exception:  # noqa: BLE001
                tr = None
            readiness = None
            if isinstance(tr, list) and tr:
                readiness = _int(tr[0].get("score"))
            elif isinstance(tr, dict):
                readiness = _int(tr.get("score"))
            if readiness is None:
                continue
            out.append({
                "calendar_date": d.isoformat(),
                "readiness": readiness,
                "body_battery": None,
                "hrv_status": None,
            })
        return out


# --------------------------- small unit helpers ---------------------------- #
def _int(v):
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _m_to_km(v):
    return round(v / 1000.0, 3) if isinstance(v, (int, float)) else None


def _s_to_h(v):
    return round(v / 3600.0, 2) if isinstance(v, (int, float)) else None


def _g_to_kg(v):
    return round(v / 1000.0, 2) if isinstance(v, (int, float)) else None


def _parse_dt(s):
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except (ValueError, TypeError):
            continue
    return None


def _epoch_date(ms):
    try:
        return datetime.utcfromtimestamp(ms / 1000.0).date().isoformat()
    except (TypeError, ValueError):
        return date.today().isoformat()


def _date_range(since: date):
    """Yield each date from `since` to today inclusive (capped at 31 days)."""
    today = date.today()
    span = min((today - since).days, 31)
    for i in range(span + 1):
        yield since + timedelta(days=i)
