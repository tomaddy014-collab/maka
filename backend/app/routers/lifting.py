"""Lifting endpoints (Phase 3): exercise library, workout logging, progressive
overload + automatic PR tracking.

Units are metric (kg). A 'PR' here = the heaviest weight ever lifted for an
exercise, and (separately) the best estimated 1RM via the Epley formula
(1RM ≈ weight * (1 + reps/30)), which rewards rep PRs at sub-max loads too.
"""
from __future__ import annotations
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..auth import require_auth
from ..db import get_db
from .. import models

router = APIRouter(prefix="/lifting", tags=["lifting"], dependencies=[Depends(require_auth)])


# ----------------------------- schemas ------------------------------------- #
class ExerciseIn(BaseModel):
    name: str
    muscle_group: str | None = None


class ExerciseOut(ExerciseIn):
    id: int
    class Config: from_attributes = True


class SetIn(BaseModel):
    exercise_id: int
    reps: int | None = None
    weight_kg: float | None = None
    rpe: float | None = None


class WorkoutIn(BaseModel):
    performed_at: datetime | None = None
    notes: str | None = None
    sets: list[SetIn] = []


class SetOut(BaseModel):
    id: int
    exercise_id: int
    set_index: int
    reps: int | None
    weight_kg: float | None
    rpe: float | None
    class Config: from_attributes = True


class WorkoutOut(BaseModel):
    id: int
    performed_at: datetime
    notes: str | None
    sets: list[SetOut]
    class Config: from_attributes = True


def epley_1rm(weight: float | None, reps: int | None) -> float | None:
    if not weight or not reps:
        return None
    return round(weight * (1 + reps / 30.0), 1)


# ----------------------------- exercises ----------------------------------- #
@router.get("/exercises", response_model=list[ExerciseOut])
def list_exercises(db: Session = Depends(get_db)):
    return db.query(models.Exercise).order_by(models.Exercise.name).all()


@router.post("/exercises", response_model=ExerciseOut)
def create_exercise(body: ExerciseIn, db: Session = Depends(get_db)):
    existing = db.query(models.Exercise).filter(func.lower(models.Exercise.name) == body.name.lower()).first()
    if existing:
        return existing
    ex = models.Exercise(name=body.name, muscle_group=body.muscle_group)
    db.add(ex); db.commit(); db.refresh(ex)
    return ex


# ----------------------------- workouts ------------------------------------ #
@router.post("/workouts", response_model=WorkoutOut)
def log_workout(body: WorkoutIn, db: Session = Depends(get_db)):
    w = models.Workout(performed_at=body.performed_at or datetime.utcnow(), notes=body.notes)
    db.add(w); db.flush()
    for i, s in enumerate(body.sets, start=1):
        if not db.get(models.Exercise, s.exercise_id):
            raise HTTPException(404, f"Exercise {s.exercise_id} not found")
        db.add(models.LiftSet(workout_id=w.id, exercise_id=s.exercise_id, set_index=i,
                              reps=s.reps, weight_kg=s.weight_kg, rpe=s.rpe))
    db.commit(); db.refresh(w)
    return w


@router.get("/workouts", response_model=list[WorkoutOut])
def list_workouts(limit: int = 20, db: Session = Depends(get_db)):
    return (db.query(models.Workout)
            .order_by(models.Workout.performed_at.desc()).limit(limit).all())


# --------------------- progressive overload + PRs -------------------------- #
@router.get("/exercises/{exercise_id}/progress")
def exercise_progress(exercise_id: int, db: Session = Depends(get_db)):
    """Time series for the overload chart: per workout date, the top set weight
    and the total volume (sum of reps*weight)."""
    ex = db.get(models.Exercise, exercise_id)
    if not ex:
        raise HTTPException(404, "Exercise not found")
    rows = (db.query(models.LiftSet, models.Workout.performed_at)
            .join(models.Workout, models.LiftSet.workout_id == models.Workout.id)
            .filter(models.LiftSet.exercise_id == exercise_id)
            .order_by(models.Workout.performed_at).all())
    byday: dict[str, dict] = {}
    for s, when in rows:
        key = when.date().isoformat()
        d = byday.setdefault(key, {"date": key, "top_weight_kg": 0.0, "volume_kg": 0.0, "best_1rm": 0.0})
        if s.weight_kg:
            d["top_weight_kg"] = max(d["top_weight_kg"], s.weight_kg)
            d["volume_kg"] += (s.weight_kg or 0) * (s.reps or 0)
            d["best_1rm"] = max(d["best_1rm"], epley_1rm(s.weight_kg, s.reps) or 0)
    return {"exercise": ExerciseOut.model_validate(ex).model_dump(),
            "series": list(byday.values())}


@router.get("/prs")
def personal_records(db: Session = Depends(get_db)):
    """Automatic PRs per exercise: heaviest weight and best estimated 1RM."""
    out = []
    for ex in db.query(models.Exercise).all():
        sets = db.query(models.LiftSet).filter(
            models.LiftSet.exercise_id == ex.id, models.LiftSet.weight_kg.isnot(None)).all()
        if not sets:
            continue
        heaviest = max(sets, key=lambda s: s.weight_kg)
        best = max(sets, key=lambda s: epley_1rm(s.weight_kg, s.reps) or 0)
        out.append({
            "exercise_id": ex.id, "exercise": ex.name,
            "max_weight_kg": heaviest.weight_kg,
            "max_weight_reps": heaviest.reps,
            "best_est_1rm_kg": epley_1rm(best.weight_kg, best.reps),
        })
    return sorted(out, key=lambda r: r["exercise"])
