"""Analytics + the AI cardio suggestion engine (Phase 5).

Two halves:
  1. /analytics/trends  — cross-domain series (training load, recovery, sleep,
     body weight, nutrition) for charts and cross-insights.
  2. /analytics/cardio-suggestion — the standout feature. Gathers recent Garmin
     cardio + recovery, recent lifting, and nutrition context, then asks Claude
     (server-side, key never leaves the backend) for ONE reasoned cardio
     suggestion that BALANCES fat-loss and endurance and is HONEST about the
     trade-off. Advisory only; the reasoning is always returned.
"""
from __future__ import annotations
from datetime import date, datetime, timedelta
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_auth
from ..config import get_settings
from ..db import get_db
from .. import models

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_auth)])
settings = get_settings()


# --------------------------- trends / cross-insights ------------------------ #
@router.get("/trends")
def trends(days: int = 30, db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    since_dt = datetime.combine(since, datetime.min.time())

    activities = (db.query(models.Activity)
                  .filter(models.Activity.start_time >= since_dt)
                  .order_by(models.Activity.start_time).all())
    # Daily training load proxy: sum of activity duration (min) + lifting volume.
    load: dict[str, float] = {}
    for a in activities:
        key = a.start_time.date().isoformat()
        load[key] = load.get(key, 0) + (a.duration_s or 0) / 60.0

    lifts = (db.query(models.LiftSet, models.Workout.performed_at)
             .join(models.Workout, models.LiftSet.workout_id == models.Workout.id)
             .filter(models.Workout.performed_at >= since_dt).all())
    for s, when in lifts:
        key = when.date().isoformat()
        load[key] = load.get(key, 0) + (s.weight_kg or 0) * (s.reps or 0) / 100.0  # scaled

    sleep = {r.calendar_date.isoformat(): r.total_sleep_h
             for r in db.query(models.SleepRecord).filter(models.SleepRecord.calendar_date >= since)}
    recovery = {r.calendar_date.isoformat(): r.readiness
                for r in db.query(models.RecoveryScore).filter(models.RecoveryScore.calendar_date >= since)}
    weight = {r.calendar_date.isoformat(): r.weight_kg
              for r in db.query(models.BodyMetric).filter(models.BodyMetric.calendar_date >= since)}

    return {
        "training_load": [{"date": k, "value": round(v, 1)} for k, v in sorted(load.items())],
        "sleep_h": [{"date": k, "value": v} for k, v in sorted(sleep.items())],
        "readiness": [{"date": k, "value": v} for k, v in sorted(recovery.items())],
        "weight_kg": [{"date": k, "value": v} for k, v in sorted(weight.items())],
    }


# --------------------------- AI cardio engine ------------------------------- #
class CardioActionIn(BaseModel):
    suggestion_id: int
    action: str          # accepted | tweaked | dismissed
    note: str | None = None


def _gather_context(db: Session) -> dict:
    """Assemble the recent picture the engine reasons over."""
    week_ago = datetime.utcnow() - timedelta(days=7)
    acts = (db.query(models.Activity)
            .filter(models.Activity.start_time >= week_ago)
            .order_by(models.Activity.start_time.desc()).limit(10).all())
    recovery = db.query(models.RecoveryScore).order_by(models.RecoveryScore.calendar_date.desc()).first()
    sleep = db.query(models.SleepRecord).order_by(models.SleepRecord.calendar_date.desc()).first()
    recent_lifts = (db.query(models.Workout)
                    .filter(models.Workout.performed_at >= week_ago)
                    .order_by(models.Workout.performed_at.desc()).limit(5).all())
    # Summarise last lift session's muscle groups (legs heavy yesterday => easy zone-2).
    last_groups = []
    if recent_lifts:
        for s in recent_lifts[0].sets:
            ex = db.get(models.Exercise, s.exercise_id)
            if ex and ex.muscle_group:
                last_groups.append(ex.muscle_group)
    return {
        "today": date.today().isoformat(),
        "goals": ["fat_loss", "endurance"],
        "recent_activities": [
            {"type": a.activity_type, "when": a.start_time.isoformat(),
             "distance_km": a.distance_km, "duration_min": round((a.duration_s or 0) / 60, 1),
             "avg_hr": a.avg_hr} for a in acts],
        "readiness": recovery.readiness if recovery else None,
        "body_battery": recovery.body_battery if recovery else None,
        "last_sleep_h": sleep.total_sleep_h if sleep else None,
        "last_lift": {"when": recent_lifts[0].performed_at.isoformat() if recent_lifts else None,
                      "muscle_groups": sorted(set(last_groups))},
        "lift_sessions_this_week": len(recent_lifts),
    }


# JSON schema for the engine's structured output — clean to parse + render.
SUGGESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "session_type": {"type": "string"},      # e.g. "Zone-2 easy", "intervals", "rest"
        "duration_min": {"type": "integer"},
        "intensity": {"type": "string"},          # plain-language, not a rigid HR prescription
        "reasoning": {"type": "string"},          # WHY — always shown
        "tradeoff": {"type": "string"},           # honest fat-loss vs endurance trade-off
        "cross_reference": {"type": "string"},    # how recovery/lifting shaped this
        "confidence": {"type": "string"},
    },
    "required": ["session_type", "duration_min", "intensity", "reasoning",
                 "tradeoff", "cross_reference", "confidence"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You are Atlas's cardio advisor for a single athlete whose goals are BOTH \
fat loss AND endurance. These goals partly conflict (calorie deficit vs fuelling/volume). \
Your job: suggest ONE cardio session for today, balancing the two goals and being HONEST when \
they trade off. Cross-reference recovery readiness, recent sleep, and the last lifting session: \
if legs were trained heavy recently or readiness is low, prefer easy zone-2 over intervals and \
say why. This is ADVISORY ONLY — frame everything as an informed suggestion the athlete can \
adjust, never a rigid medical or non-negotiable prescription. Always explain your reasoning. \
Use metric units (km, kg) and 24-hour time. Keep each field concise."""


@router.post("/cardio-suggestion")
def cardio_suggestion(db: Session = Depends(get_db)):
    if not settings.anthropic_api_key:
        raise HTTPException(400, "ANTHROPIC_API_KEY not configured on the backend.")
    try:
        import anthropic
    except ImportError:
        raise HTTPException(500, "anthropic package not installed.")

    context = _gather_context(db)
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        resp = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=1500,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            output_config={"format": {"type": "json_schema", "schema": SUGGESTION_SCHEMA}},
            messages=[{"role": "user", "content":
                       "Here is my recent data. Suggest today's cardio session.\n\n"
                       + json.dumps(context, indent=2)}],
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"AI engine call failed: {exc}")

    text = next((b.text for b in resp.content if b.type == "text"), "{}")
    try:
        suggestion = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(502, "AI engine returned unparseable output.")

    row = models.CardioSuggestion(suggestion=json.dumps(suggestion))
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "suggestion": suggestion, "context": context}


@router.post("/cardio-action")
def cardio_action(body: CardioActionIn, db: Session = Depends(get_db)):
    row = db.get(models.CardioSuggestion, body.suggestion_id)
    if not row:
        raise HTTPException(404, "Suggestion not found")
    if body.action not in ("accepted", "tweaked", "dismissed"):
        raise HTTPException(400, "action must be accepted|tweaked|dismissed")
    row.user_action = body.action
    row.user_note = body.note
    db.commit()
    return {"ok": True}


@router.get("/cardio-history")
def cardio_history(limit: int = 10, db: Session = Depends(get_db)):
    rows = (db.query(models.CardioSuggestion)
            .order_by(models.CardioSuggestion.id.desc()).limit(limit).all())
    return [{"id": r.id, "created_at": r.created_at,
             "suggestion": json.loads(r.suggestion),
             "action": r.user_action, "note": r.user_note} for r in rows]
