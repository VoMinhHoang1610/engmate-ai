"""Validated API inputs matching the SQL Server and current learning UI."""

import re
from datetime import date
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    ValidationInfo,
    field_validator,
)

from app.schemas.ai import Level

MAX_ID = 9223372036854775807


class Input(BaseModel):
    """Reject server-owned fields instead of silently accepting forged data."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("*")
    @classmethod
    def sql_length(cls, value: object, info: ValidationInfo) -> object:
        """Respect SQL Server nvarchar capacities, including UTF-16 surrogate pairs."""
        if isinstance(value, str) and info.field_name:
            try:
                units = len(value.encode("utf-16-le")) // 2
            except UnicodeEncodeError as exc:
                raise ValueError("Text contains invalid Unicode.") from exc
            for constraint in cls.model_fields[info.field_name].metadata:
                maximum = getattr(constraint, "max_length", None)
                if maximum is not None and units > maximum:
                    raise ValueError("Text exceeds the SQL Server UTF-16 length limit.")
        return value


def strong_password(value: SecretStr) -> SecretStr:
    """Bound hashing work and require a useful minimum password length."""
    if not 10 <= len(value.get_secret_value()) <= 128:
        raise ValueError("Password must contain 10 to 128 characters.")
    return value


class Register(Input):
    """Create a password account and its learner profile atomically."""

    username: str = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: str = Field(max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: SecretStr
    display_name: str = Field(min_length=1, max_length=60)

    _password = field_validator("password")(strong_password)


class Login(Input):
    """Accept either username or email without a hard-coded demo account."""

    identifier: str = Field(min_length=1, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=128)


class Refresh(Input):
    """Opaque refresh tokens are only stored as SHA-256 hashes."""

    refresh_token: str = Field(min_length=30, max_length=128)


class EmailRequest(Input):
    """Send an account-token link without exposing account existence."""

    email: str = Field(max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ResetPassword(Input):
    """Consume a reset token once and revoke existing sessions."""

    token: str = Field(min_length=30, max_length=128)
    new_password: SecretStr
    _password = field_validator("new_password")(strong_password)


class PasswordChange(Input):
    """Require the current password before changing credentials."""

    current_password: SecretStr = Field(min_length=1, max_length=128)
    new_password: SecretStr
    _password = field_validator("new_password")(strong_password)


class Versioned(Input):
    """Use SQL Server rowversion as an explicit optimistic concurrency token."""

    version: str = Field(pattern=r"^[0-9a-fA-F]{16}$")


class AccountUpdate(Versioned):
    """Change username/email with current-password confirmation and rowversion."""

    username: str = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: str = Field(max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    current_password: SecretStr = Field(min_length=1, max_length=128)


class ProfileUpdate(Versioned):
    """Editable learner fields; account email and identity are separate."""

    display_name: str = Field(min_length=1, max_length=60)
    phone_number: str | None = Field(
        default=None, max_length=32, pattern=r"^[+0-9 ()-]+$"
    )
    birth_date: date | None = None
    gender: Literal["male", "female", "other"] | None = None
    avatar_asset_id: int | None = Field(default=None, gt=0, le=MAX_ID)
    cefr_level: Level = "A2"
    learning_goal: str = Field(default="Giao tiếp tự tin", min_length=1, max_length=200)
    daily_goal_minutes: int = Field(default=20, ge=10, le=60)
    time_zone_id: str = Field(default="Asia/Ho_Chi_Minh", max_length=64)

    @field_validator("birth_date")
    @classmethod
    def past_birth_date(cls, value: date | None) -> date | None:
        """A birth date cannot be in the future."""
        if value is not None and value > date.today():
            raise ValueError("Birth date cannot be in the future.")
        return value

    @field_validator("time_zone_id")
    @classmethod
    def valid_time_zone(cls, value: str) -> str:
        """Keep daily reporting consistent with an IANA timezone."""
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Unknown IANA time zone.") from exc
        return value


class SettingsUpdate(Versioned):
    """Only the UI's supported display/audio settings may be saved."""

    theme: Literal["light", "dark", "system"]
    reduced_motion: bool
    speech_rate: float

    @field_validator("speech_rate")
    @classmethod
    def supported_rate(cls, value: float) -> float:
        """Only expose the three rates the UI and schema support."""
        if value not in (0.75, 1.0, 1.25):
            raise ValueError("Speech rate must be 0.75, 1.0 or 1.25.")
        return value


class VocabularyCreate(Input):
    """Create one private notebook entry with optional owned provenance."""

    word: str = Field(min_length=1, max_length=120)
    meaning: str = Field(min_length=1, max_length=1000)
    phonetic: str | None = Field(default=None, max_length=200)
    part_of_speech: str | None = Field(default=None, max_length=50)
    example_sentence: str | None = Field(default=None, max_length=2000)
    source_message_id: int | None = Field(default=None, gt=0, le=MAX_ID)
    source_attempt_id: int | None = Field(default=None, gt=0, le=MAX_ID)


class VocabularyUpdate(VocabularyCreate, Versioned):
    """Update entry content while preserving the server's review schedule."""


class MasteryUpdate(Versioned):
    """Record the learner's explicit self-assessment, separate from a review."""

    is_mastered: bool


class ConversationCreate(Input):
    """Start a roleplay or free chat with an idempotent request ID."""

    client_request_id: UUID
    topic_code: str | None = Field(default=None, min_length=1, max_length=40)
    level: Level = "A2"
    title: str = Field(default="English practice", min_length=1, max_length=200)


class MessageCreate(Input):
    """Send a user turn; the backend assigns owner, role and sequence."""

    client_request_id: UUID
    message: str = Field(min_length=1, max_length=2000)


class Answer(Input):
    """Submit either an option ID or dictation text; never client scoring."""

    question_id: int = Field(gt=0, le=MAX_ID)
    selected_option_id: int | None = Field(default=None, gt=0, le=MAX_ID)
    answer_text: str | None = Field(default=None, min_length=1, max_length=2000)


class AttemptCreate(Input):
    """Start one immutable revision before the learner begins practising."""

    client_request_id: UUID
    lesson_id: int = Field(gt=0, le=MAX_ID)
    mode: Literal["shadowing", "multiple_choice", "dictation", "writing"]
    playback_rate: float | None = Field(default=None, ge=0.5, le=2.0)


class AttemptSubmit(Versioned):
    """Submit work after starting; duration comes from the server session."""

    submitted_text: str | None = Field(default=None, min_length=1, max_length=5000)
    recording_asset_id: int | None = Field(default=None, gt=0, le=MAX_ID)
    answers: list[Answer] = Field(default_factory=list, max_length=100)


class FlashcardCreate(Input):
    """Start a due-word or review-all session."""

    client_request_id: UUID
    review_all: bool = False


class ReviewCreate(Input):
    """One rating; repeated request IDs must not advance the schedule twice."""

    client_request_id: UUID
    vocabulary_id: int = Field(gt=0, le=MAX_ID)
    rating: Literal["again", "hard", "good", "easy"]


def database_fields(values: dict[str, object]) -> dict[str, object]:
    """Map validated snake_case input fields to the existing SQL column names."""
    return {
        "".join(part.capitalize() for part in key.split("_")): value
        for key, value in values.items()
    }


def snake_name(name: str) -> str:
    """Convert PascalCase SQL names including AI acronyms to JSON snake_case."""
    return re.sub(
        r"([a-z0-9])([A-Z])", r"\1_\2", re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    ).lower()
