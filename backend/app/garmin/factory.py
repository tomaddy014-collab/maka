"""Picks the Garmin adapter implementation from config. The ONE place that
knows both implementations exist."""
from __future__ import annotations

from ..config import get_settings
from .base import GarminAdapter
from .unofficial import UnofficialGarminAdapter
from .official import OfficialGarminAdapter

_singleton: GarminAdapter | None = None


def get_adapter() -> GarminAdapter:
    """Return the configured adapter (cached so garth sessions are reused)."""
    global _singleton
    if _singleton is not None:
        return _singleton
    s = get_settings()
    if s.garmin_adapter == "official":
        _singleton = OfficialGarminAdapter(s.garmin_health_api_key, s.garmin_health_api_secret)
    else:
        _singleton = UnofficialGarminAdapter(s.garmin_email, s.garmin_password, s.garmin_token_dir)
    return _singleton


def reset_adapter() -> None:
    """Drop the cached adapter (used after re-auth or in tests)."""
    global _singleton
    _singleton = None
