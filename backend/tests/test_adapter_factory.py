"""Adapter factory picks the right implementation from config."""
from app.garmin.factory import get_adapter, reset_adapter
from app.garmin.unofficial import UnofficialGarminAdapter
from app.garmin.official import OfficialGarminAdapter
import app.garmin.factory as factory
import app.config as config


def test_factory_defaults_to_unofficial():
    reset_adapter()
    assert isinstance(get_adapter(), UnofficialGarminAdapter)


def test_factory_official_when_configured(monkeypatch):
    reset_adapter()
    s = config.get_settings()
    monkeypatch.setattr(s, "garmin_adapter", "official")
    assert isinstance(get_adapter(), OfficialGarminAdapter)
    reset_adapter()


def test_official_adapter_methods_are_stubbed():
    import pytest
    from datetime import date
    a = OfficialGarminAdapter("k", "s")
    with pytest.raises(NotImplementedError):
        a.get_activities(date.today())
