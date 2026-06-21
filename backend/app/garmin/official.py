"""Official Garmin Health API adapter — STUB for later.

Fill this in if/when you're accepted into the Garmin Developer Program. It
implements the SAME interface as the unofficial adapter, so flipping
GARMIN_ADAPTER=official is the only change the rest of the app sees.

The official Health API is OAuth-based and push/pull oriented; the methods
below are placeholders that raise clearly until implemented.
"""
from __future__ import annotations
from datetime import date

from .base import GarminAdapter


class OfficialGarminAdapter(GarminAdapter):
    name = "official"

    def __init__(self, api_key: str, api_secret: str):
        self._api_key = api_key
        self._api_secret = api_secret

    def _not_ready(self):
        raise NotImplementedError(
            "Official Garmin Health API adapter is a stub. Set "
            "GARMIN_ADAPTER=unofficial, or implement this once you have "
            "Garmin Developer Program access."
        )

    def get_activities(self, since: date, limit: int = 20) -> list[dict]:
        self._not_ready()

    def get_sleep(self, since: date) -> list[dict]:
        self._not_ready()

    def get_body_metrics(self, since: date) -> list[dict]:
        self._not_ready()

    def get_recovery(self, since: date) -> list[dict]:
        self._not_ready()
