"""Sync orchestration: pull from the Garmin adapter, upsert into the DB.

SCHEDULED SYNC — trade-offs (kept deliberately simple):
  We use APScheduler running IN the FastAPI process. Pros: zero extra infra,
  one deploy on Railway, trivial to reason about. Cons: it only runs while the
  web process is up, and a multi-replica deploy would run it on each replica
  (fine for single-user / single instance). If you outgrow that, graduate to a
  Railway cron job or an external scheduler hitting POST /garmin/sync. For one
  user on one instance, in-process is the right amount of engineering.
"""
from __future__ import annotations
from datetime import date, datetime, timedelta
import json

from sqlalchemy.orm import Session

from . import models
from .garmin.base import GarminAdapter, GarminAuthError, GarminRateLimitError
from .garmin.factory import get_adapter
from .db import SessionLocal


def _upsert_activity(db: Session, a: dict) -> bool:
    if not a.get("external_id") or not a.get("start_time"):
        return False
    existing = db.query(models.Activity).filter_by(external_id=a["external_id"]).first()
    if existing:
        return False
    db.add(models.Activity(
        external_id=a["external_id"],
        activity_type=a.get("activity_type", "unknown"),
        start_time=datetime.fromisoformat(a["start_time"]),
        duration_s=a.get("duration_s"),
        distance_km=a.get("distance_km"),
        avg_hr=a.get("avg_hr"),
        max_hr=a.get("max_hr"),
        calories=a.get("calories"),
        raw=json.dumps(a),
    ))
    return True


def _upsert_dated(db: Session, model, payload: dict, fields: list[str]) -> bool:
    """Upsert a row keyed on calendar_date."""
    d = date.fromisoformat(payload["calendar_date"])
    row = db.query(model).filter_by(calendar_date=d).first()
    if row is None:
        row = model(calendar_date=d)
        db.add(row)
    for f in fields:
        setattr(row, f, payload.get(f))
    return True


def run_sync(db: Session, adapter: GarminAdapter | None = None, days: int = 14) -> dict:
    """Pull recent data and persist it. Returns a counts summary; records a
    SyncLog row either way so the UI can show status and failures."""
    adapter = adapter or get_adapter()
    since = date.today() - timedelta(days=days)
    log = models.SyncLog(adapter=adapter.name)
    db.add(log)
    db.flush()

    counts = {"activities": 0, "sleep": 0, "body_metrics": 0, "recovery": 0}
    try:
        for a in adapter.get_activities(since):
            counts["activities"] += int(_upsert_activity(db, a))
        for s in adapter.get_sleep(since):
            _upsert_dated(db, models.SleepRecord, s,
                          ["total_sleep_h", "deep_h", "rem_h", "light_h", "awake_h", "sleep_score"])
            counts["sleep"] += 1
        for b in adapter.get_body_metrics(since):
            _upsert_dated(db, models.BodyMetric, b, ["weight_kg", "body_fat_pct", "resting_hr"])
            counts["body_metrics"] += 1
        for r in adapter.get_recovery(since):
            _upsert_dated(db, models.RecoveryScore, r, ["readiness", "body_battery", "hrv_status"])
            counts["recovery"] += 1

        log.ok = True
        log.message = "Sync completed."
        log.counts = json.dumps(counts)
        log.finished_at = datetime.utcnow()
        db.commit()
        return {"ok": True, "counts": counts}

    except (GarminAuthError, GarminRateLimitError) as exc:
        db.rollback()
        log.ok = False
        log.message = str(exc)
        log.finished_at = datetime.utcnow()
        db.add(log)
        db.commit()
        return {"ok": False, "error": str(exc),
                "needs_reauth": isinstance(exc, GarminAuthError)}
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        log.ok = False
        log.message = f"Unexpected error: {exc}"
        log.finished_at = datetime.utcnow()
        db.add(log)
        db.commit()
        return {"ok": False, "error": str(exc)}


def scheduled_sync_job() -> None:
    """Entry point for APScheduler — manages its own DB session."""
    db = SessionLocal()
    try:
        run_sync(db)
    finally:
        db.close()
