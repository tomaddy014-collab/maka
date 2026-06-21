"""Analytics: trends aggregation + cardio engine (Anthropic call mocked).

The AI engine is tested with a fake anthropic client so no network/key is used.
"""
import json
import types
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.db import get_db
from app.auth import require_auth
from app import models
import app.config as config


@pytest.fixture()
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[require_auth] = lambda: "atlas-user"
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed_activity(db):
    db.add(models.Activity(external_id="a1", activity_type="running",
                           start_time=datetime.utcnow() - timedelta(days=1),
                           duration_s=1800, distance_km=5.0, avg_hr=150))
    db.add(models.RecoveryScore(calendar_date=(datetime.utcnow()).date(), readiness=30))
    db.commit()


def test_trends_aggregates(client, db_session):
    _seed_activity(db_session)
    t = client.get("/analytics/trends?days=30").json()
    assert any(p["value"] > 0 for p in t["training_load"])
    assert t["readiness"][-1]["value"] == 30


def test_cardio_suggestion_requires_key(client):
    # default settings have empty anthropic_api_key
    r = client.post("/analytics/cardio-suggestion")
    assert r.status_code == 400


def test_cardio_suggestion_with_mocked_engine(client, db_session, monkeypatch):
    _seed_activity(db_session)
    # Give a key and stub the anthropic client.
    monkeypatch.setattr(config.get_settings(), "anthropic_api_key", "test-key")

    fake_payload = {
        "session_type": "Zone-2 easy", "duration_min": 40,
        "intensity": "conversational pace", "reasoning": "Readiness is low.",
        "tradeoff": "Easy session limits fat-burn intensity but protects recovery.",
        "cross_reference": "Readiness 30 and legs trained recently -> keep it easy.",
        "confidence": "medium",
    }

    class FakeMessages:
        def create(self, **kw):
            assert kw["model"] == "claude-opus-4-8"
            block = types.SimpleNamespace(type="text", text=json.dumps(fake_payload))
            return types.SimpleNamespace(content=[block])

    class FakeClient:
        def __init__(self, **kw): self.messages = FakeMessages()

    import anthropic
    monkeypatch.setattr(anthropic, "Anthropic", FakeClient)

    r = client.post("/analytics/cardio-suggestion")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["suggestion"]["session_type"] == "Zone-2 easy"
    assert "context" in data

    # Log an action against it.
    a = client.post("/analytics/cardio-action",
                    json={"suggestion_id": data["id"], "action": "accepted", "note": "did 42 min"})
    assert a.json()["ok"] is True
    hist = client.get("/analytics/cardio-history").json()
    assert hist[0]["action"] == "accepted"
