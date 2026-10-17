"""Exercise password/JWT boundaries without any account database or paid provider."""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt
import pytest
from fastapi import HTTPException
from pydantic import SecretStr, ValidationError

from app.core.config import Settings
from app.core.security import (
    PASSWORDS,
    access_token,
    decode_access,
    token_hash,
    verify_password,
)
from app.schemas.chat import ConversationCreate, MessageCreate, Register

SECRET = "isolated-test-key-with-more-than-32-characters"


def test_password_hash_and_opaque_tokens() -> None:
    """Reject wrong/missing/corrupt hashes and verify opaque-token hashing."""
    encoded = PASSWORDS.hash("a-long-test-password")
    assert encoded != "a-long-test-password"
    assert verify_password("a-long-test-password", encoded)
    assert not verify_password("incorrect", encoded)
    assert not verify_password("incorrect", None)
    assert not verify_password("incorrect", "invalid-hash")
    assert len(token_hash("opaque-test-token")) == 32
    assert token_hash("opaque-test-token") != token_hash("other-test-token")


def test_access_token_roundtrip_and_missing_secret() -> None:
    """Access tokens are purpose scoped and cannot use an implicit signing secret."""
    settings = Settings(jwt_secret=SecretStr(SECRET))
    subject = str(uuid4())
    token = access_token(settings, subject, 7)
    assert decode_access(settings, token)["sub"] == subject
    with pytest.raises(HTTPException) as error:
        access_token(Settings(), subject, 7)
    assert error.value.status_code == 503
    with pytest.raises(ValidationError):
        Settings(database_odbc_connection=SecretStr("test-connection"))


@pytest.mark.parametrize(
    "changes",
    [
        {"exp": datetime.now(UTC) - timedelta(minutes=1)},
        {"aud": "other-app"},
        {"iss": "other-issuer"},
        {"type": "refresh"},
        {"sid": "7"},
        {"sid": True},
        {"sid": 0},
    ],
)
def test_reject_invalid_claims(changes: dict[str, Any]) -> None:
    """Reject tokens with the wrong expiry, audience, purpose or session shape."""
    claims = {
        "sub": str(uuid4()),
        "sid": 7,
        "type": "access",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(minutes=1),
        "iss": "engmate-ai",
        "aud": "engmate-web",
        **changes,
    }
    token = jwt.encode(claims, SECRET, algorithm="HS256")
    with pytest.raises(HTTPException) as error:
        decode_access(Settings(jwt_secret=SecretStr(SECRET)), token)
    assert error.value.status_code == 401


@pytest.mark.parametrize("password", ["short", "x" * 129])
def test_password_bounds(password: str) -> None:
    """Reject tiny passwords and unbounded Argon2 inputs before any database call."""
    with pytest.raises(ValidationError):
        Register(
            username="test",
            email="test@example.test",
            display_name="Test",
            password=SecretStr(password),
        )


def test_message_validation() -> None:
    """Reject oversized, invalid Unicode, empty and forged message fields."""
    for value in (" ", "😀" * 1001, "\ud800"):
        with pytest.raises(ValidationError):
            MessageCreate(client_request_id=uuid4(), message=value)
    with pytest.raises(ValidationError):
        MessageCreate.model_validate(
            {"client_request_id": str(uuid4()), "message": "Hello", "user_id": 1}
        )


@pytest.mark.parametrize("level", ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"])
def test_persisted_levels_match_sql_schema(level: str) -> None:
    """Expanded mock levels must not bypass the SQL v1 CHECK/column limits."""
    conversation = {"client_request_id": uuid4(), "level": level}
    assert ConversationCreate.model_validate(conversation).level == level
