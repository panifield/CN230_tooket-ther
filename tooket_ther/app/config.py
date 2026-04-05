from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field("Tooket-ther API", alias="APP_NAME")
    debug: bool = Field(False, alias="DEBUG")

    database_url: str = Field("postgresql+psycopg://tooket:tooket@localhost:5432/tooket_ther", alias="DATABASE_URL")
    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")

    # Comma-separated list
    cors_origins: str = Field("http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000", alias="CORS_ORIGINS")

    # JWT (HS256). Set a long random secret in production.
    jwt_secret_key: str = Field("change-me-in-production-use-openssl-rand-hex-32", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = Field(10080, alias="JWT_ACCESS_EXPIRE_MINUTES")
    jwt_admission_expire_minutes: int = Field(10, alias="JWT_ADMISSION_EXPIRE_MINUTES")

    # OAuth
    oauth_line_channel_id: str = Field("", alias="OAUTH_LINE_CHANNEL_ID")
    oauth_line_channel_secret: str = Field("", alias="OAUTH_LINE_CHANNEL_SECRET")
    oauth_facebook_app_id: str = Field("", alias="OAUTH_FACEBOOK_APP_ID")
    oauth_facebook_app_secret: str = Field("", alias="OAUTH_FACEBOOK_APP_SECRET")
    oauth_redirect_uri_line: str = Field("http://localhost:3000/auth/callback", alias="OAUTH_REDIRECT_URI_LINE")
    oauth_redirect_uri_facebook: str = Field("http://localhost:3000/auth/callback", alias="OAUTH_REDIRECT_URI_FACEBOOK")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
