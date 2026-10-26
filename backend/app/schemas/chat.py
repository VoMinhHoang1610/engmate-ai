"""Bounded account and conversation contracts for the chat API."""

import re
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    ValidationInfo,
    field_validator,
    model_validator,
)

from app.schemas.ai import Level

MAX_ID = 9223372036854775807
DatabaseLevel = Level


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


class ConversationCreate(Input):
    """Start a roleplay or free chat with an idempotent request ID."""

    client_request_id: UUID
    level: DatabaseLevel = "A2"
    title: str = Field(default="English practice", min_length=1, max_length=200)
    lesson_id: str | None = Field(
        default=None, min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$"
    )


class MessageCreate(Input):
    """Send a user turn; the backend assigns owner, role and sequence."""

    client_request_id: UUID
    message: str = Field(min_length=1, max_length=2000)
    voice: bool = False
    voice_gender: Literal["male", "female"] | None = None

    @model_validator(mode="after")
    def voice_identity(self) -> "MessageCreate":
        """Only spoken turns may supply the selected speaker's gender."""
        if self.voice_gender is not None and not self.voice:
            raise ValueError("Voice gender requires voice mode.")
        return self


class PlaybackReceipt(Input):
    """A monotonic played prefix in Unicode code points, never arbitrary text."""

    heard_chars: int = Field(ge=0, le=12000)


def snake_name(name: str) -> str:
    """Convert PascalCase SQL names including AI acronyms to JSON snake_case."""
    return re.sub(
        r"([a-z0-9])([A-Z])", r"\1_\2", re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    ).lower()
