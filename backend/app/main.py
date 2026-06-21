"""ATLAS FastAPI app — Phase 2 (Garmin sync).

Wires the routers, CORS for the frontend, DB init + quote seeding, and the
optional in-process scheduled sync (see sync_service.py for trade-offs).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db, SessionLocal
from .seed import seed_quotes, seed_exercises
from .routers import auth, garmin, dashboard, lifting

settings = get_settings()
_scheduler = None  # APScheduler instance, created only if enabled


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    init_db()
    db = SessionLocal()
    try:
        seed_quotes(db)
        seed_exercises(db)
    finally:
        db.close()

    global _scheduler
    if settings.enable_scheduled_sync:
        # Simplest reliable scheduled sync: in-process APScheduler. See
        # sync_service.py for the trade-offs vs. external cron.
        from apscheduler.schedulers.background import BackgroundScheduler
        from .sync_service import scheduled_sync_job
        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.add_job(scheduled_sync_job, "interval",
                           hours=settings.sync_interval_hours, id="garmin_sync")
        _scheduler.start()

    yield

    # --- shutdown ---
    if _scheduler:
        _scheduler.shutdown(wait=False)


app = FastAPI(title="ATLAS API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(garmin.router)
app.include_router(dashboard.router)
app.include_router(lifting.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "adapter": settings.garmin_adapter}
