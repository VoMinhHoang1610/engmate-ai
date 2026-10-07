"""Validated environment configuration for the starter backend."""

import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, SecretStr, model_validator


class Settings(BaseModel):
    """Only the mock provider is enabled until a real adapter is implemented."""

    app_name: str = "EngMate-AI"
    model_config = ConfigDict(hide_input_in_errors=True)
    llm_provider: Literal["mock"] = "mock"
    database_odbc_connection: SecretStr | None = None
    jwt_secret: SecretStr | None = None
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=30, ge=1, le=90)
    auth_requests_per_minute: int = Field(default=30, ge=1, le=1000)
    media_directory: Path = Path(__file__).resolve().parents[3] / ".artifacts" / "media"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_sender: str | None = None
    frontend_url: str = "http://127.0.0.1:5174"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5174", "http://127.0.0.1:5174"]
    )

    @model_validator(mode="after")
    def validate_database_auth(self) -> "Settings":
        """Require an explicit signing secret when private data is enabled."""
        if self.database_odbc_connection and (
            not self.jwt_secret or len(self.jwt_secret.get_secret_value()) < 32
        ):
            raise ValueError(
                "JWT_SECRET must contain at least 32 characters when DB is enabled."
            )
        return self


def get_settings() -> Settings:
    """Read process environment without caching state across tests."""
    load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=False)
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5174,http://127.0.0.1:5174")
    return Settings.model_validate(
        {
            "app_name": os.getenv("APP_NAME", "EngMate-AI"),
            "llm_provider": os.getenv("LLM_PROVIDER", "mock"),
            "database_odbc_connection": os.getenv("DATABASE_ODBC_CONNECTION") or None,
            "jwt_secret": os.getenv("JWT_SECRET") or None,
            "access_token_minutes": os.getenv("ACCESS_TOKEN_MINUTES", "15"),
            "refresh_token_days": os.getenv("REFRESH_TOKEN_DAYS", "30"),
            "auth_requests_per_minute": os.getenv("AUTH_REQUESTS_PER_MINUTE", "30"),
            "media_directory": (
                Path(__file__).resolve().parents[3]
                / os.getenv("MEDIA_DIRECTORY", ".artifacts/media")
            ),
            "smtp_host": os.getenv("SMTP_HOST") or None,
            "smtp_port": os.getenv("SMTP_PORT", "587"),
            "smtp_username": os.getenv("SMTP_USERNAME") or None,
            "smtp_password": os.getenv("SMTP_PASSWORD") or None,
            "smtp_sender": os.getenv("SMTP_SENDER") or None,
            "frontend_url": os.getenv("FRONTEND_URL", "http://127.0.0.1:5174"),
            "cors_origins": [
                origin.strip() for origin in origins.split(",") if origin.strip()
            ],
        }
    )
