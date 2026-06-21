"""Dashboard + quotes read endpoints."""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_auth
from ..db import get_db
from .. import models
from ..schemas import DashboardOut, ActivityOut, QuoteOut

router = APIRouter(tags=["dashboard"], dependencies=[Depends(require_auth)])

LOW_READINESS = 40  # at/below this, surface a recovery quote


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    last_activity = db.query(models.Activity).order_by(models.Activity.start_time.desc()).first()
    recent = db.query(models.Activity).order_by(models.Activity.start_time.desc()).limit(5).all()
    last_sleep = db.query(models.SleepRecord).order_by(models.SleepRecord.calendar_date.desc()).first()
    last_recovery = db.query(models.RecoveryScore).order_by(models.RecoveryScore.calendar_date.desc()).first()
    last_weight = db.query(models.BodyMetric).order_by(models.BodyMetric.calendar_date.desc()).first()
    last_log = db.query(models.SyncLog).filter_by(ok=True).order_by(models.SyncLog.id.desc()).first()

    readiness = last_recovery.readiness if last_recovery else None
    recovery_quote = None
    if readiness is not None and readiness <= LOW_READINESS:
        recovery_quote = (
            db.query(models.Quote)
            .filter_by(category="recovery")
            .order_by(models.Quote.id)
            .first()
        )

    return DashboardOut(
        readiness=readiness,
        last_activity=ActivityOut.model_validate(last_activity) if last_activity else None,
        last_sleep_h=last_sleep.total_sleep_h if last_sleep else None,
        latest_weight_kg=last_weight.weight_kg if last_weight else None,
        recent_activities=[ActivityOut.model_validate(a) for a in recent],
        last_synced=last_log.finished_at if last_log else None,
        recovery_quote=QuoteOut.model_validate(recovery_quote) if recovery_quote else None,
    )


@router.get("/quotes", response_model=list[QuoteOut])
def list_quotes(category: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Quote)
    if category:
        q = q.filter_by(category=category)
    return [QuoteOut.model_validate(x) for x in q.order_by(models.Quote.id).all()]
