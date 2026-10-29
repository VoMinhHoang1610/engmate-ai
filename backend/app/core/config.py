"""Validated environment configuration for the starter backend."""

import os
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, SecretStr, model_validator


class Settings(BaseModel):
    """Validate credentials privately; mock is an explicit test configuration."""

    app_name: str = "EngMate-AI"
    avatar_storage_dir: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parents[3]
        / ".artifacts"
        / "avatars"
    )
    model_config = ConfigDict(hide_input_in_errors=True)
    llm_provider: Literal["mock", "blaze", "openai", "gemini"] = "gemini"
    voice_provider: Literal["blaze", "native"] = "blaze"
    gemini_api_key: SecretStr | None = None
    gemini_chat_model: str = Field(
        default="gemini-3.5-flash-lite", pattern=r"^gemini-[a-zA-Z0-9._-]+$"
    )
    gemini_live_model: str = Field(
        default="gemini-3.8-live", pattern=r"^gemini-[a-zA-Z0-9._-]+$"
    )
    gemini_voice: str = Field(default="Kore", pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    gemini_max_output_tokens: int = Field(default=2048, ge=64, le=8192)
    openai_api_key: SecretStr | None = None
    openai_chat_model: str = "gpt-4.1-mini"
    openai_realtime_model: str = "gpt-realtime"
    openai_voice: str = "marin"
    openai_max_output_tokens: int = Field(default=800, ge=64, le=4096)
    voice_max_session_seconds: int = Field(default=600, ge=30, le=1800)
    voice_vad_silence_ms: int = Field(default=900, ge=500, le=2000)
    voice_vad_threshold: float = Field(default=0.5, ge=0.1, le=0.9)
    blaze_api_key: SecretStr | None = None
    blaze_tts_model: str = "v2.0_pro"
    blaze_stt_model: Literal["stt-async-1.0", "stt-async-1.5"] = "stt-async-1.5"
    blaze_stt_mode: Literal["batch", "realtime"] = "batch"
    blaze_stt_realtime_model: Literal["stt-stream-1.5"] = "stt-stream-1.5"
    blaze_local_demo: bool = False
    speech_max_jobs: int = Field(default=16, ge=1, le=128)
    speech_max_jobs_per_user: int = Field(default=4, ge=1, le=16)
    chat_max_jobs: int = Field(default=16, ge=1, le=128)
    chat_max_jobs_per_user: int = Field(default=2, ge=1, le=16)
    voice_timing_logs: bool = False
    database_odbc_connection: SecretStr | None = None
    database_mysql_url: SecretStr | None = None
    jwt_secret: SecretStr | None = None
    oauth_public_origin: str = Field(
        default="http://127.0.0.1:5174", pattern=r"^https?://[^/?#]+$"
    )
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None
    facebook_client_id: str | None = None
    facebook_client_secret: SecretStr | None = None
    facebook_graph_version: str = Field(default="v24.0", pattern=r"^v[0-9]+\.0$")
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=30, ge=1, le=90)
    auth_requests_per_minute: int = Field(default=30, ge=1, le=1000)
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5174", "http://127.0.0.1:5174"]
    )

    @model_validator(mode="after")
    def validate_database_auth(self) -> "Settings":
        """Require an explicit signing secret when private data is enabled."""
        origin = urlsplit(self.oauth_public_origin)
        if not origin.hostname or origin.username or origin.password:
            raise ValueError(
                "OAUTH_PUBLIC_ORIGIN must be an origin without credentials."
            )
        if self.database_mysql_url and self.database_odbc_connection:
            raise ValueError("Configure only one database connection.")
        if self.database_mysql_url:
            from sqlalchemy.engine import make_url
            from sqlalchemy.exc import ArgumentError

            try:
                url = make_url(self.database_mysql_url.get_secret_value())
            except ArgumentError:
                raise ValueError(
                    "DATABASE_MYSQL_URL is not a valid database URL."
                ) from None
            if url.drivername != "mysql+pymysql" or not url.database:
                raise ValueError(
                    "DATABASE_MYSQL_URL requires mysql+pymysql and a database."
                )
        if self.database_configured and (
            not self.jwt_secret or len(self.jwt_secret.get_secret_value()) < 32
        ):
            raise ValueError(
                "JWT_SECRET must contain at least 32 characters when DB is enabled."
            )
        return self

    @property
    def database_configured(self) -> bool:
        """Private data requires authentication with either database driver."""
        return bool(self.database_mysql_url or self.database_odbc_connection)

    @property
    def chat_configured(self) -> bool:
        """Describe local configuration, without claiming upstream account access."""
        return (self.llm_provider == "gemini" and bool(self.gemini_api_key)) or (
            self.llm_provider == "openai" and bool(self.openai_api_key)
        )

    @property
    def voice_configured(self) -> bool:
        """Require the text brain and the selected speech service independently."""
        return self.chat_configured and (
            self.voice_provider == "native" or bool(self.blaze_api_key)
        )


def get_settings() -> Settings:
    """Read process environment without caching state across tests."""
    load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=False)
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5174,http://127.0.0.1:5174")
    if os.getenv("LLM_PROVIDER", "gemini") == "mock":
        raise ValueError("Mock is test-only; configure LLM_PROVIDER=gemini.")
    return Settings.model_validate(
        {
            "app_name": os.getenv("APP_NAME", "EngMate-AI"),
            **(
                {"avatar_storage_dir": os.environ["AVATAR_STORAGE_DIR"]}
                if os.getenv("AVATAR_STORAGE_DIR")
                else {}
            ),
            "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
            "voice_provider": os.getenv("VOICE_PROVIDER", "blaze"),
            "gemini_api_key": os.getenv("GEMINI_API_KEY") or None,
            "gemini_chat_model": os.getenv(
                "GEMINI_CHAT_MODEL", "gemini-3.5-flash-lite"
            ),
            "gemini_live_model": os.getenv("GEMINI_LIVE_MODEL", "gemini-3.8-live"),
            "gemini_voice": os.getenv("GEMINI_VOICE", "Kore"),
            "gemini_max_output_tokens": os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "2048"),
            "openai_api_key": os.getenv("OPENAI_API_KEY") or None,
            "openai_chat_model": os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1-mini"),
            "openai_realtime_model": os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime"),
            "openai_voice": os.getenv("OPENAI_VOICE", "marin"),
            "openai_max_output_tokens": os.getenv("OPENAI_MAX_OUTPUT_TOKENS", "800"),
            "voice_max_session_seconds": os.getenv("VOICE_MAX_SESSION_SECONDS", "600"),
            "voice_vad_silence_ms": os.getenv("VOICE_VAD_SILENCE_MS", "900"),
            "voice_vad_threshold": os.getenv("VOICE_VAD_THRESHOLD", "0.5"),
            "blaze_api_key": os.getenv("BLAZE_API_KEY") or None,
            "blaze_tts_model": os.getenv("BLAZE_TTS_MODEL", "v2.0_pro"),
            "blaze_stt_model": os.getenv("BLAZE_STT_MODEL", "stt-async-1.5"),
            "blaze_stt_mode": os.getenv("BLAZE_STT_MODE", "batch"),
            "blaze_stt_realtime_model": os.getenv(
                "BLAZE_STT_REALTIME_MODEL", "stt-stream-1.5"
            ),
            "blaze_local_demo": os.getenv("BLAZE_LOCAL_DEMO", "false"),
            "speech_max_jobs": os.getenv("SPEECH_MAX_JOBS", "16"),
            "speech_max_jobs_per_user": os.getenv("SPEECH_MAX_JOBS_PER_USER", "4"),
            "chat_max_jobs": os.getenv("CHAT_MAX_JOBS", "16"),
            "chat_max_jobs_per_user": os.getenv("CHAT_MAX_JOBS_PER_USER", "2"),
            "voice_timing_logs": os.getenv("VOICE_TIMING_LOGS", "false"),
            "database_odbc_connection": os.getenv("DATABASE_ODBC_CONNECTION") or None,
            "database_mysql_url": os.getenv("DATABASE_MYSQL_URL") or None,
            "jwt_secret": os.getenv("JWT_SECRET") or None,
            "oauth_public_origin": os.getenv(
                "OAUTH_PUBLIC_ORIGIN", "http://127.0.0.1:5174"
            ),
            "google_client_id": os.getenv("GOOGLE_CLIENT_ID") or None,
            "google_client_secret": os.getenv("GOOGLE_CLIENT_SECRET") or None,
            "facebook_client_id": os.getenv("FACEBOOK_CLIENT_ID") or None,
            "facebook_client_secret": os.getenv("FACEBOOK_CLIENT_SECRET") or None,
            "facebook_graph_version": os.getenv("FACEBOOK_GRAPH_VERSION", "v24.0"),
            "access_token_minutes": os.getenv("ACCESS_TOKEN_MINUTES", "15"),
            "refresh_token_days": os.getenv("REFRESH_TOKEN_DAYS", "30"),
            "auth_requests_per_minute": os.getenv("AUTH_REQUESTS_PER_MINUTE", "30"),
            "cors_origins": [
                origin.strip() for origin in origins.split(",") if origin.strip()
            ],
        }
    )
