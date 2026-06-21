"""Garmin endpoints: manual sync, re-auth (MFA), and sync status."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_auth
from ..db import get_db
from ..schemas import ReauthRequest
from ..sync_service import run_sync
from ..garmin.factory import get_adapter, reset_adapter
from ..garmin.base import GarminAuthError
from .. import models

router = APIRouter(prefix="/garmin", tags=["garmin"], dependencies=[Depends(require_auth)])


@router.post("/sync")
def sync_now(db: Session = Depends(get_db)):
    """Manual 'Sync now'. Returns counts or a structured error (incl.
    needs_reauth so the frontend can prompt for MFA)."""
    return run_sync(db)


@router.post("/reauth")
def reauth(body: ReauthRequest):
    """Re-authenticate the unofficial adapter, handling MFA codes.

    POST with no code to start; if the response says needs_mfa, POST again
    with the code from your email/authenticator.
    """
    reset_adapter()
    adapter = get_adapter()
    if not hasattr(adapter, "login_with_mfa"):
        return {"ok": False, "message": "Active adapter does not support interactive re-auth."}
    try:
        return adapter.login_with_mfa(body.mfa_code)
    except GarminAuthError as exc:
        return {"ok": False, "needs_mfa": False, "message": str(exc)}


@router.get("/status")
def status(db: Session = Depends(get_db)):
    last = db.query(models.SyncLog).order_by(models.SyncLog.id.desc()).first()
    if not last:
        return {"last_synced": None, "ok": None, "message": "No sync yet.", "adapter": get_adapter().name}
    return {
        "last_synced": last.finished_at,
        "ok": last.ok,
        "message": last.message,
        "counts": last.counts,
        "adapter": last.adapter,
    }
