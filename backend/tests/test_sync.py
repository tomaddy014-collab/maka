"""Sync service: the fake adapter's data lands in the DB, idempotently."""
from app import models
from app.sync_service import run_sync


def test_run_sync_persists_data(db_session, fake_adapter):
    result = run_sync(db_session, adapter=fake_adapter, days=7)
    assert result["ok"] is True
    assert result["counts"]["activities"] == 1
    assert db_session.query(models.Activity).count() == 1
    assert db_session.query(models.SleepRecord).count() == 1
    assert db_session.query(models.BodyMetric).count() == 1
    assert db_session.query(models.RecoveryScore).count() == 1


def test_run_sync_is_idempotent_for_activities(db_session, fake_adapter):
    run_sync(db_session, adapter=fake_adapter, days=7)
    run_sync(db_session, adapter=fake_adapter, days=7)
    # Same external_id must not duplicate.
    assert db_session.query(models.Activity).count() == 1


def test_sync_logs_recorded(db_session, fake_adapter):
    run_sync(db_session, adapter=fake_adapter, days=7)
    log = db_session.query(models.SyncLog).order_by(models.SyncLog.id.desc()).first()
    assert log is not None and log.ok is True
