"""Validated environment configuration for the starter backend."""

import os
from typing import Literal

from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Only the mock provider is enabled until a real adapter is implemented."""

    app_name: str = "EngMate-AI"
    llm_provider: Literal["mock"] = "mock"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5174", "http://127.0.0.1:5174"]
    )


def get_settings() -> Settings:
    """Read process environment without caching state across tests."""
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5174,http://127.0.0.1:5174")
    return Settings.model_validate(
        {
            "app_name": os.getenv("APP_NAME", "EngMate-AI"),
            "llm_provider": os.getenv("LLM_PROVIDER", "mock"),
            "cors_origins": [
                origin.strip() for origin in origins.split(",") if origin.strip()
            ],
        }
    )
