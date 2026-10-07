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
from app.schemas.learning import ProfileUpdate, Register, SettingsUpdate

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


def test_profile_validation() -> None:
    """Validate timezone, SQL UTF-16 capacity and future birth dates."""
    base = {"version": "0" * 16, "display_name": "Name"}
    for changes in (
        {"time_zone_id": "missing"},
        {"display_name": "😀" * 31},
        {"display_name": "\ud800"},
        {"birth_date": "2999-01-01"},
    ):
        with pytest.raises(ValidationError):
            ProfileUpdate.model_validate({**base, **changes})
    with pytest.raises(ValidationError):
        SettingsUpdate(
            version="0" * 16, theme="light", reduced_motion=False, speech_rate=0.8
        )
