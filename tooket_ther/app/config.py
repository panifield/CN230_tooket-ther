from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Tooket-ther API"
    debug: bool = False

    database_url: str = "postgresql+psycopg://tooket:tooket@localhost:5432/tooket_ther"
    redis_url: str = "redis://localhost:6379/0"

    # Comma-separated list, e.g. "http://localhost:3000,http://localhost:5173"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # JWT (HS256). Set a long random secret in production.
    jwt_secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60 * 24 * 7
    jwt_admission_expire_minutes: int = 10

    # OAuth — register apps at Line / Meta developers; redirect_uri must match provider console.
    oauth_line_channel_id: str = ""
    oauth_line_channel_secret: str = ""
    oauth_facebook_app_id: str = ""
    oauth_facebook_app_secret: str = ""
    oauth_redirect_uri_line: str = "http://localhost:3000/auth/line/callback"
    oauth_redirect_uri_facebook: str = "http://localhost:3000/auth/facebook/callback"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
