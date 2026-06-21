"""Nutrition endpoints (Phase 4): Open Food Facts search/barcode, food logging
against daily macro/calorie targets, and daily/weekly summaries.

Units: energy stored as kcal; responses include kJ too (1 kcal = 4.184 kJ).
Macros in grams. Open Food Facts is a free, no-key API; we proxy it server-side
so the frontend needs no CORS exceptions and we can normalise the messy data.
"""
from __future__ import annotations
from datetime import datetime, date, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_auth
from ..db import get_db
from .. import models

router = APIRouter(prefix="/nutrition", tags=["nutrition"], dependencies=[Depends(require_auth)])

KJ_PER_KCAL = 4.184
OFF_BASE = "https://world.openfoodfacts.org"


def kj(kcal: float | None) -> float | None:
    return round(kcal * KJ_PER_KCAL, 1) if kcal is not None else None


# ------------------------------ schemas ------------------------------------ #
class FoodOut(BaseModel):
    name: str
    barcode: str | None = None
    kcal_per_100g: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None


class FoodSaved(FoodOut):
    id: int
    class Config: from_attributes = True


class EntryIn(BaseModel):
    food_id: int | None = None     # log an existing food, OR...
    food: FoodOut | None = None    # ...embed a food (e.g. straight from OFF) to upsert+log
    grams: float = 100.0
    meal: str | None = None
    logged_at: datetime | None = None


class TargetIn(BaseModel):
    kcal: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None


# --------------------- Open Food Facts proxy ------------------------------- #
def _normalise_off(p: dict) -> FoodOut | None:
    n = p.get("nutriments") or {}
    name = p.get("product_name") or p.get("generic_name")
    if not name:
        return None
    return FoodOut(
        name=name.strip()[:256],
        barcode=str(p.get("code")) if p.get("code") else None,
        kcal_per_100g=n.get("energy-kcal_100g"),
        protein_g=n.get("proteins_100g"),
        carbs_g=n.get("carbohydrates_100g"),
        fat_g=n.get("fat_100g"),
    )


@router.get("/search", response_model=list[FoodOut])
def search_foods(q: str):
    """Search Open Food Facts by text. Degrades to an empty list (502) if the
    network is unavailable — the rest of nutrition logging still works."""
    try:
        with httpx.Client(timeout=8.0, headers={"User-Agent": "ATLAS/0.4 (personal)"}) as c:
            r = c.get(f"{OFF_BASE}/cgi/search.pl",
                      params={"search_terms": q, "json": 1, "page_size": 20,
                              "fields": "code,product_name,generic_name,nutriments"})
            r.raise_for_status()
            products = r.json().get("products", [])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Open Food Facts unreachable: {exc}")
    out = [f for f in (_normalise_off(p) for p in products) if f and f.kcal_per_100g is not None]
    return out


@router.get("/barcode/{code}", response_model=FoodOut)
def lookup_barcode(code: str):
    try:
        with httpx.Client(timeout=8.0, headers={"User-Agent": "ATLAS/0.4 (personal)"}) as c:
            r = c.get(f"{OFF_BASE}/api/v2/product/{code}.json")
            r.raise_for_status()
            data = r.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Open Food Facts unreachable: {exc}")
    if data.get("status") != 1:
        raise HTTPException(404, "Product not found in Open Food Facts.")
    food = _normalise_off(data.get("product", {}))
    if not food:
        raise HTTPException(404, "Product has no usable nutrition data.")
    return food


# ------------------------------ foods -------------------------------------- #
def _upsert_food(db: Session, f: FoodOut) -> models.Food:
    row = None
    if f.barcode:
        row = db.query(models.Food).filter_by(barcode=f.barcode).first()
    if not row:
        row = models.Food(name=f.name, barcode=f.barcode)
        db.add(row)
    row.kcal_per_100g = f.kcal_per_100g
    row.protein_g = f.protein_g
    row.carbs_g = f.carbs_g
    row.fat_g = f.fat_g
    db.flush()
    return row


@router.post("/foods", response_model=FoodSaved)
def save_food(body: FoodOut, db: Session = Depends(get_db)):
    row = _upsert_food(db, body)
    db.commit(); db.refresh(row)
    return row


# ------------------------------ entries ------------------------------------ #
@router.post("/entries")
def log_entry(body: EntryIn, db: Session = Depends(get_db)):
    if body.food_id is not None:
        food = db.get(models.Food, body.food_id)
        if not food:
            raise HTTPException(404, "Food not found")
    elif body.food is not None:
        food = _upsert_food(db, body.food)
    else:
        raise HTTPException(400, "Provide food_id or an embedded food.")
    entry = models.FoodEntry(food_id=food.id, grams=body.grams, meal=body.meal,
                             logged_at=body.logged_at or datetime.utcnow())
    db.add(entry); db.commit(); db.refresh(entry)
    return {"id": entry.id, "food_id": food.id, "grams": entry.grams}


def _entry_macros(food: models.Food, grams: float) -> dict:
    scale = (grams or 0) / 100.0
    return {
        "kcal": round((food.kcal_per_100g or 0) * scale, 1),
        "protein_g": round((food.protein_g or 0) * scale, 1),
        "carbs_g": round((food.carbs_g or 0) * scale, 1),
        "fat_g": round((food.fat_g or 0) * scale, 1),
    }


@router.get("/entries")
def list_entries(day: date | None = None, db: Session = Depends(get_db)):
    day = day or date.today()
    start = datetime.combine(day, datetime.min.time())
    end = start + timedelta(days=1)
    rows = (db.query(models.FoodEntry, models.Food)
            .join(models.Food, models.FoodEntry.food_id == models.Food.id)
            .filter(models.FoodEntry.logged_at >= start, models.FoodEntry.logged_at < end)
            .order_by(models.FoodEntry.logged_at).all())
    out = []
    for e, f in rows:
        m = _entry_macros(f, e.grams)
        out.append({"id": e.id, "food": f.name, "meal": e.meal, "grams": e.grams,
                    "logged_at": e.logged_at, **m, "kj": kj(m["kcal"])})
    return out


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    e = db.get(models.FoodEntry, entry_id)
    if not e:
        raise HTTPException(404, "Entry not found")
    db.delete(e); db.commit()
    return {"ok": True}


# ------------------------------ targets ------------------------------------ #
@router.get("/targets")
def get_targets(db: Session = Depends(get_db)):
    t = db.query(models.NutritionTarget).order_by(models.NutritionTarget.id.desc()).first()
    if not t:
        return {"kcal": None, "protein_g": None, "carbs_g": None, "fat_g": None}
    return {"kcal": t.kcal, "protein_g": t.protein_g, "carbs_g": t.carbs_g, "fat_g": t.fat_g,
            "kj": kj(t.kcal)}


@router.put("/targets")
def set_targets(body: TargetIn, db: Session = Depends(get_db)):
    t = models.NutritionTarget(kcal=body.kcal, protein_g=body.protein_g,
                               carbs_g=body.carbs_g, fat_g=body.fat_g, effective_from=date.today())
    db.add(t); db.commit()
    return {"ok": True}


# ------------------------------ summary ------------------------------------ #
def _totals_for_range(db: Session, start: date, end: date) -> dict:
    s = datetime.combine(start, datetime.min.time())
    e = datetime.combine(end, datetime.min.time())
    rows = (db.query(models.FoodEntry, models.Food)
            .join(models.Food, models.FoodEntry.food_id == models.Food.id)
            .filter(models.FoodEntry.logged_at >= s, models.FoodEntry.logged_at < e).all())
    tot = {"kcal": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for entry, food in rows:
        m = _entry_macros(food, entry.grams)
        for k in tot:
            tot[k] += m[k]
    return {k: round(v, 1) for k, v in tot.items()}


@router.get("/summary")
def summary(day: date | None = None, db: Session = Depends(get_db)):
    """Daily totals vs targets + a 7-day rolling kcal series for the weekly view."""
    day = day or date.today()
    totals = _totals_for_range(db, day, day + timedelta(days=1))
    targets = get_targets(db)
    remaining = None
    if targets.get("kcal") is not None:
        remaining = round(targets["kcal"] - totals["kcal"], 1)
    week = []
    for i in range(6, -1, -1):
        d = day - timedelta(days=i)
        t = _totals_for_range(db, d, d + timedelta(days=1))
        week.append({"date": d.isoformat(), "kcal": t["kcal"]})
    return {"day": day.isoformat(), "totals": {**totals, "kj": kj(totals["kcal"])},
            "targets": targets, "kcal_remaining": remaining, "week": week}
