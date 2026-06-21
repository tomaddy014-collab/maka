"""Lifting: exercise library, workout logging, PRs, progressive overload."""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.db import get_db
from app.auth import require_auth
from app.seed import seed_exercises
from app.routers.lifting import epley_1rm


@pytest.fixture()
def client(db_session):
    seed_exercises(db_session)
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[require_auth] = lambda: "atlas-user"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_epley_formula():
    assert epley_1rm(100, 1) == round(100 * (1 + 1/30), 1)   # 103.3
    assert epley_1rm(100, 10) == round(100 * (1 + 10/30), 1)
    # heavier-for-fewer can still beat lighter-for-more on estimated 1RM
    assert epley_1rm(110, 3) > epley_1rm(100, 5)
    assert epley_1rm(None, 5) is None


def test_seeded_exercise_library(client):
    names = [e["name"] for e in client.get("/lifting/exercises").json()]
    assert "Back Squat" in names and "Bench Press" in names


def test_create_exercise_is_idempotent_by_name(client):
    a = client.post("/lifting/exercises", json={"name": "Zercher Squat"}).json()
    b = client.post("/lifting/exercises", json={"name": "zercher squat"}).json()
    assert a["id"] == b["id"]


def test_log_workout_and_track_prs(client):
    squat = next(e for e in client.get("/lifting/exercises").json() if e["name"] == "Back Squat")
    sid = squat["id"]
    # Two sessions, the second is heavier -> new PR.
    client.post("/lifting/workouts", json={
        "performed_at": (datetime.utcnow() - timedelta(days=7)).isoformat(),
        "sets": [{"exercise_id": sid, "reps": 5, "weight_kg": 100.0}]})
    client.post("/lifting/workouts", json={
        "performed_at": datetime.utcnow().isoformat(),
        "sets": [{"exercise_id": sid, "reps": 3, "weight_kg": 110.0},
                 {"exercise_id": sid, "reps": 8, "weight_kg": 90.0}]})

    prs = {p["exercise"]: p for p in client.get("/lifting/prs").json()}
    assert prs["Back Squat"]["max_weight_kg"] == 110.0

    prog = client.get(f"/lifting/exercises/{sid}/progress").json()
    assert len(prog["series"]) == 2
    assert prog["series"][-1]["top_weight_kg"] == 110.0
    # volume on the latest day = 3*110 + 8*90 = 1050
    assert prog["series"][-1]["volume_kg"] == 3*110 + 8*90


def test_workout_with_unknown_exercise_rejected(client):
    r = client.post("/lifting/workouts", json={"sets": [{"exercise_id": 99999, "reps": 5, "weight_kg": 50}]})
    assert r.status_code == 404
