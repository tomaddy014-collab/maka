"""Dashboard endpoint via TestClient, with the fake adapter's data synced in.

Overrides the auth + DB dependencies so we don't need real Garmin or env."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import get_db
from app.auth import require_auth
from app.sync_service import run_sync
from app.seed import seed_quotes


@pytest.fixture()
def client(db_session, fake_adapter):
    seed_quotes(db_session)
    run_sync(db_session, adapter=fake_adapter, days=7)

    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[require_auth] = lambda: "atlas-user"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_dashboard_returns_synced_data(client):
    r = client.get("/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert data["readiness"] == 35
    assert data["last_sleep_h"] == 7.5
    assert data["latest_weight_kg"] == 82.4
    assert data["last_activity"]["activity_type"] == "running"
    # Readiness 35 <= 40, so a recovery quote should surface.
    assert data["recovery_quote"] is not None
    assert data["recovery_quote"]["category"] == "recovery"


def test_quotes_endpoint_filters_by_category(client):
    r = client.get("/quotes", params={"category": "pre_workout"})
    assert r.status_code == 200
    assert all(q["category"] == "pre_workout" for q in r.json())
