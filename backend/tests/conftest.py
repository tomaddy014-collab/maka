"""Shared test fixtures: in-memory DB, app password, and a fake Garmin adapter
so tests never touch the real Garmin service."""
import os
from datetime import date, datetime, timedelta

import pytest

# Configure env BEFORE importing the app/settings (settings are cached).
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["APP_PASSWORD"] = "test-pass"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["GARMIN_ADAPTER"] = "unofficial"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db as db_module
from app.db import Base
from app.garmin.base import GarminAdapter


@pytest.fixture()
def db_session():
    # A single shared in-memory connection for the test.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Point the app's SessionLocal at this engine too (for sync_service jobs).
    db_module.SessionLocal = TestSession
    db_module.engine = engine
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


class FakeGarminAdapter(GarminAdapter):
    """Deterministic in-memory adapter for tests."""
    name = "fake"

    def get_activities(self, since: date, limit: int = 20):
        return [{
            "external_id": "act-1",
            "activity_type": "running",
            "start_time": datetime.now().replace(microsecond=0).isoformat(),
            "duration_s": 1800.0, "distance_km": 5.0,
            "avg_hr": 150, "max_hr": 175, "calories": 400,
        }]

    def get_sleep(self, since: date):
        return [{
            "calendar_date": date.today().isoformat(),
            "total_sleep_h": 7.5, "deep_h": 1.2, "rem_h": 1.5,
            "light_h": 4.5, "awake_h": 0.3, "sleep_score": 82,
        }]

    def get_body_metrics(self, since: date):
        return [{"calendar_date": date.today().isoformat(),
                 "weight_kg": 82.4, "body_fat_pct": 15.0, "resting_hr": 52}]

    def get_recovery(self, since: date):
        # Low readiness so the recovery-quote path is exercised.
        return [{"calendar_date": date.today().isoformat(),
                 "readiness": 35, "body_battery": 30, "hrv_status": "low"}]


@pytest.fixture()
def fake_adapter():
    return FakeGarminAdapter()
