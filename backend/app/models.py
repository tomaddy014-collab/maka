"""ORM models — the ATLAS schema (mirrors the Phase-1 localStorage model).

Phase 2 actively uses: Activity, SleepRecord, BodyMetric, RecoveryScore,
Quote, SyncLog. The lifting/nutrition/photo tables are defined now so later
phases slot in without a migration scramble.
"""
from datetime import datetime, date

from sqlalchemy import (
    String, Integer, Float, Date, DateTime, Boolean, Text, ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


# --------------------------------------------------------------------------- #
# Phase 2 — Garmin data
# --------------------------------------------------------------------------- #
class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    activity_type: Mapped[str] = mapped_column(String(64), default="unknown")
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_s: Mapped[float | None]
    distance_km: Mapped[float | None]
    avg_hr: Mapped[int | None]
    max_hr: Mapped[int | None]
    calories: Mapped[int | None]
    raw: Mapped[str | None] = mapped_column(Text)  # JSON dump for debugging


class SleepRecord(Base):
    __tablename__ = "sleep_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    calendar_date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    total_sleep_h: Mapped[float | None]
    deep_h: Mapped[float | None]
    rem_h: Mapped[float | None]
    light_h: Mapped[float | None]
    awake_h: Mapped[float | None]
    sleep_score: Mapped[int | None]


class BodyMetric(Base):
    __tablename__ = "body_metrics"
    id: Mapped[int] = mapped_column(primary_key=True)
    calendar_date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    weight_kg: Mapped[float | None]
    body_fat_pct: Mapped[float | None]
    resting_hr: Mapped[int | None]


class RecoveryScore(Base):
    __tablename__ = "recovery_scores"
    id: Mapped[int] = mapped_column(primary_key=True)
    calendar_date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    # Garmin exposes Body Battery / training readiness; we store a 0-100 score.
    readiness: Mapped[int | None]
    body_battery: Mapped[int | None]
    hrv_status: Mapped[str | None] = mapped_column(String(32))


class SyncLog(Base):
    """Records each sync so we can show 'last synced' and surface failures."""
    __tablename__ = "sync_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    adapter: Mapped[str] = mapped_column(String(32))
    ok: Mapped[bool] = mapped_column(Boolean, default=False)
    message: Mapped[str | None] = mapped_column(Text)
    counts: Mapped[str | None] = mapped_column(Text)  # JSON: {activities: n, ...}


# --------------------------------------------------------------------------- #
# Quote bank (seeded from JSON; same categories as the frontend)
# --------------------------------------------------------------------------- #
class Quote(Base):
    __tablename__ = "quotes"
    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    text: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String(128))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)


# --------------------------------------------------------------------------- #
# Phase 3 — Weightlifting (defined now, used later)
# --------------------------------------------------------------------------- #
class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    muscle_group: Mapped[str | None] = mapped_column(String(64))


class Workout(Base):
    __tablename__ = "workouts"
    id: Mapped[int] = mapped_column(primary_key=True)
    performed_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    sets: Mapped[list["LiftSet"]] = relationship(back_populates="workout", cascade="all, delete-orphan")


class LiftSet(Base):
    __tablename__ = "sets"
    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    set_index: Mapped[int] = mapped_column(Integer, default=1)
    reps: Mapped[int | None]
    weight_kg: Mapped[float | None]
    rpe: Mapped[float | None]
    workout: Mapped["Workout"] = relationship(back_populates="sets")


# --------------------------------------------------------------------------- #
# Phase 4 — Nutrition (defined now, used later)
# --------------------------------------------------------------------------- #
class Food(Base):
    __tablename__ = "foods"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    barcode: Mapped[str | None] = mapped_column(String(64), index=True)
    kcal_per_100g: Mapped[float | None]
    protein_g: Mapped[float | None]
    carbs_g: Mapped[float | None]
    fat_g: Mapped[float | None]


class FoodEntry(Base):
    __tablename__ = "food_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    food_id: Mapped[int] = mapped_column(ForeignKey("foods.id"))
    logged_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    grams: Mapped[float | None]
    meal: Mapped[str | None] = mapped_column(String(32))  # breakfast/lunch/...


class NutritionTarget(Base):
    __tablename__ = "nutrition_targets"
    id: Mapped[int] = mapped_column(primary_key=True)
    effective_from: Mapped[date] = mapped_column(Date, default=date.today)
    kcal: Mapped[float | None]
    protein_g: Mapped[float | None]
    carbs_g: Mapped[float | None]
    fat_g: Mapped[float | None]


# --------------------------------------------------------------------------- #
# Photos — meal + progress pics (you opted IN). Stored as Supabase object keys
# in production; a URL/path is fine for now.
# --------------------------------------------------------------------------- #
class CardioSuggestion(Base):
    """A logged AI cardio suggestion + what the user actually did (Phase 5).
    Advisory only — stored so future suggestions can learn from outcomes."""
    __tablename__ = "cardio_suggestions"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    suggestion: Mapped[str] = mapped_column(Text)        # JSON: the engine's output
    user_action: Mapped[str | None] = mapped_column(String(16))  # accepted|tweaked|dismissed
    user_note: Mapped[str | None] = mapped_column(Text)  # what they actually did


class Photo(Base):
    __tablename__ = "photos"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(16))  # "meal" | "progress"
    ref_id: Mapped[int | None]                     # food_entry id, etc.
    taken_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    storage_key: Mapped[str] = mapped_column(String(512))
    note: Mapped[str | None] = mapped_column(Text)
