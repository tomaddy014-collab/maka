# ATLAS Backend — FastAPI (Phase 2: Garmin sync)

Holds the Garmin connection and reads/writes the database. The frontend talks
to it over HTTPS; the backend URL is an env var on the frontend (`VITE_API_URL`).

## Run locally
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit: APP_PASSWORD, GARMIN_EMAIL/PASSWORD, etc.
uvicorn app.main:app --reload --port 8001
```
Default DB is `sqlite:///./atlas.db` (zero-config). Set `DATABASE_URL` to your
Supabase Postgres string for production — same SQLAlchemy engine either way.

Interactive docs: http://localhost:8001/docs

## Tests
```bash
cd backend && pip install -r requirements.txt
pytest -q
```
Tests use an in-memory SQLite DB and a **FakeGarminAdapter**, so they never
touch the real Garmin service or need credentials.

## The Garmin adapter layer
One interface (`app/garmin/base.py`) with two implementations behind a config
flag (`GARMIN_ADAPTER`):
- `unofficial.py` — `garth`-backed, works today. ⚠️ Reverse-engineers Garmin
  login; outside Garmin's terms; fine for a single-user personal app.
- `official.py` — Garmin Health API **stub** for if/when you get developer
  access. Same interface, so flipping the flag is the only change.

Session: `garth` caches OAuth tokens in `GARMIN_TOKEN_DIR`, so we resume
sessions instead of re-logging-in each call. On expiry, sync returns
`needs_reauth: true`; re-authenticate (incl. MFA) via `POST /garmin/reauth`.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | password → JWT session token |
| POST | `/garmin/sync` | manual "Sync now" |
| POST | `/garmin/reauth` | re-authenticate (MFA-aware) |
| GET  | `/garmin/status` | last sync result |
| GET  | `/dashboard` | readiness, recent activities, sleep, weight |
| GET  | `/quotes` | quote bank (optional `?category=`) |
| GET  | `/health` | liveness + active adapter |

## Scheduled sync
Set `ENABLE_SCHEDULED_SYNC=true` to run an in-process APScheduler job every
`SYNC_INTERVAL_HOURS`. Simplest reliable option for one user on one instance;
graduate to an external cron hitting `POST /garmin/sync` if you scale out. See
`app/sync_service.py` for the trade-offs.

## Deploy (Railway)
1. New Railway project → deploy this `backend/` folder.
2. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Set env vars from `.env.example` (`DATABASE_URL` = Supabase string,
   `APP_PASSWORD`, `JWT_SECRET`, `GARMIN_*`, `FRONTEND_ORIGINS` = your Netlify
   URL). Never commit the real `.env`.
