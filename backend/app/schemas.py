"""Pydantic response/request models for the API."""
from __future__ import annotations
from datetime import datetime, date

from pydantic import BaseModel


class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ReauthRequest(BaseModel):
    mfa_code: str | None = None


class ActivityOut(BaseModel):
    id: int
    activity_type: str
    start_time: datetime
    duration_s: float | None = None
    distance_km: float | None = None
    avg_hr: int | None = None
    calories: int | None = None

    class Config:
        from_attributes = True


class SleepOut(BaseModel):
    calendar_date: date
    total_sleep_h: float | None = None
    sleep_score: int | None = None

    class Config:
        from_attributes = True


class RecoveryOut(BaseModel):
    calendar_date: date
    readiness: int | None = None
    body_battery: int | None = None

    class Config:
        from_attributes = True


class QuoteOut(BaseModel):
    id: int
    category: str
    text: str
    author: str
    verified: bool

    class Config:
        from_attributes = True


class DashboardOut(BaseModel):
    readiness: int | None
    last_activity: ActivityOut | None
    last_sleep_h: float | None
    latest_weight_kg: float | None
    recent_activities: list[ActivityOut]
    last_synced: datetime | None
    recovery_quote: QuoteOut | None  # surfaced when readiness is low
