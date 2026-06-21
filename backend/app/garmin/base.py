"""The Garmin adapter INTERFACE.

The rest of the app talks ONLY to this interface — it never knows whether the
data came from the unofficial reverse-engineered client or the official Garmin
Health API. A config flag (GARMIN_ADAPTER) picks the implementation at runtime.

Normalised return shapes (plain dicts, units already metric):
  activity:  {external_id, activity_type, start_time(iso), duration_s,
              distance_km, avg_hr, max_hr, calories}
  sleep:     {calendar_date(iso), total_sleep_h, deep_h, rem_h, light_h,
              awake_h, sleep_score}
  body:      {calendar_date(iso), weight_kg, body_fat_pct, resting_hr}
  recovery:  {calendar_date(iso), readiness, body_battery, hrv_status}
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import date


class GarminAuthError(Exception):
    """Login/session failure — surface a 're-authenticate' prompt to the user."""


class GarminRateLimitError(Exception):
    """Garmin throttled us — back off and tell the user to retry later."""


class GarminAdapter(ABC):
    """One interface, two implementations behind it."""

    name: str = "base"

    @abstractmethod
    def get_activities(self, since: date, limit: int = 20) -> list[dict]:
        ...

    @abstractmethod
    def get_sleep(self, since: date) -> list[dict]:
        ...

    @abstractmethod
    def get_body_metrics(self, since: date) -> list[dict]:
        ...

    @abstractmethod
    def get_recovery(self, since: date) -> list[dict]:
        ...
