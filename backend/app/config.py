"""Central configuration, loaded from environment / .env.

One DATABASE_URL drives both local (sqlite default) and cloud (Supabase
Postgres) so the engine is identical everywhere. All secrets come from env.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — sqlite fallback keeps local dev zero-config.
    database_url: str = "sqlite:///./atlas.db"

    # Single-user auth
    app_password: str = "change-me"
    jwt_secret: str = "dev-insecure-secret-change-me"
    jwt_expire_minutes: int = 10080

    # Garmin adapter
    garmin_adapter: str = "unofficial"  # "unofficial" | "official"
    garmin_email: str = ""
    garmin_password: str = ""
    garmin_token_dir: str = "./.garmin_session"
    garmin_health_api_key: str = ""
    garmin_health_api_secret: str = ""

    # Scheduled sync
    enable_scheduled_sync: bool = False
    sync_interval_hours: int = 6

    # CORS
    frontend_origins: str = "http://localhost:5173,http://localhost:8000"

    # Anthropic (later)
    anthropic_api_key: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
