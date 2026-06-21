"""Nutrition: food logging, macro scaling, targets vs summary, OFF normalise.

Network calls to Open Food Facts are NOT made here — search/barcode are thin
proxies tested via the normaliser; logging/summary are pure DB logic.
"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.db import get_db
from app.auth import require_auth
from app.routers.nutrition import _normalise_off, kj


@pytest.fixture()
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[require_auth] = lambda: "atlas-user"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_kj_conversion():
    assert kj(100) == 418.4
    assert kj(None) is None


def test_off_normaliser():
    p = {"code": "123", "product_name": "Oats",
         "nutriments": {"energy-kcal_100g": 389, "proteins_100g": 16.9,
                        "carbohydrates_100g": 66, "fat_100g": 6.9}}
    f = _normalise_off(p)
    assert f.name == "Oats" and f.barcode == "123" and f.kcal_per_100g == 389
    assert _normalise_off({"nutriments": {}}) is None  # no name -> skip


def test_log_embedded_food_and_macro_scaling(client):
    # Log 150g of a food at 100 kcal/100g -> 150 kcal.
    r = client.post("/nutrition/entries", json={
        "grams": 150, "meal": "breakfast",
        "food": {"name": "Test Food", "kcal_per_100g": 100, "protein_g": 10,
                 "carbs_g": 20, "fat_g": 5}})
    assert r.status_code == 200
    entries = client.get("/nutrition/entries").json()
    assert len(entries) == 1
    e = entries[0]
    assert e["kcal"] == 150.0 and e["protein_g"] == 15.0
    assert e["kj"] == kj(150.0)


def test_targets_and_summary_remaining(client):
    client.put("/nutrition/targets", json={"kcal": 2200, "protein_g": 180})
    client.post("/nutrition/entries", json={
        "grams": 200, "food": {"name": "Rice", "kcal_per_100g": 130, "protein_g": 2.7}})
    s = client.get("/nutrition/summary").json()
    assert s["totals"]["kcal"] == 260.0
    assert s["kcal_remaining"] == 2200 - 260.0
    assert len(s["week"]) == 7
    assert s["week"][-1]["kcal"] == 260.0  # today is the last bucket


def test_delete_entry(client):
    client.post("/nutrition/entries", json={
        "grams": 100, "food": {"name": "X", "kcal_per_100g": 50}})
    eid = client.get("/nutrition/entries").json()[0]["id"]
    assert client.delete(f"/nutrition/entries/{eid}").json()["ok"] is True
    assert client.get("/nutrition/entries").json() == []
