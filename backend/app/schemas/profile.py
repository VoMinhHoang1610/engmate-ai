"""Editable learner profile fields over the existing database schema."""

from datetime import date
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, field_validator

from app.schemas.chat import Input

Level = Literal["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"]


class ProfileUpdate(Input):
    """Require the last read version and reject edits to account identity."""

    version: str = Field(pattern=r"^[0-9a-fA-F]{16}$")
    display_name: str = Field(min_length=1, max_length=60)
    phone_number: str | None = Field(
        default=None, max_length=32, pattern=r"^[+0-9 ()-]+$"
    )
    birth_date: date | None = None
    gender: Literal["male", "female", "other"] | None = None
    cefr_level: Level = "A2"
    learning_goal: str = Field(min_length=1, max_length=200)
    daily_goal_minutes: int = Field(ge=10, le=60)
    time_zone_id: str = Field(default="Asia/Ho_Chi_Minh", max_length=64)

    @field_validator("birth_date")
    @classmethod
    def past_birth_date(cls, value: date | None) -> date | None:
        """Reject future dates before opening a database transaction."""
        if value is not None and value > date.today():
            raise ValueError("Birth date cannot be in the future.")
        return value

    @field_validator("time_zone_id")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        """Keep existing local-day calculations on a valid IANA timezone."""
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Unknown IANA time zone.") from exc
        return value


class ProfileResponse(ProfileUpdate):
    """Expose only editable details, private avatar availability and study totals."""

    has_avatar: bool
    total_study_minutes: int
