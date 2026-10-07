"""Password hashing and purpose-limited JWT access tokens."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import HTTPException

from app.core.config import Settings

PASSWORDS = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
DUMMY_HASH = PASSWORDS.hash(secrets.token_urlsafe(32))


def token_hash(token: str) -> bytes:
    """Store only hashes of opaque refresh/account tokens."""
    return hashlib.sha256(token.encode()).digest()


def verify_password(password: str, encoded: str | None) -> bool:
    """Use the same hash verification path for missing and valid accounts."""
    try:
        verified = PASSWORDS.verify(encoded or DUMMY_HASH, password)
        return verified and encoded is not None
    except (VerificationError, InvalidHashError):
        return False


def signing_secret(settings: Settings) -> str:
    """Private APIs cannot run with an implicit development signing secret."""
    if settings.jwt_secret is None:
        raise HTTPException(503, "Authentication is not configured.")
    return settings.jwt_secret.get_secret_value()


def access_token(settings: Settings, subject: str, session_id: int) -> str:
    """Issue an expiring token tied to one revocable database session."""
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": subject,
            "sid": session_id,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_minutes),
            "iss": "engmate-ai",
            "aud": "engmate-web",
        },
        signing_secret(settings),
        algorithm="HS256",
    )


def decode_access(settings: Settings, token: str) -> dict[str, Any]:
    """Validate algorithm, issuer, audience, expiry and required claims."""
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            signing_secret(settings),
            algorithms=["HS256"],
            issuer="engmate-ai",
            audience="engmate-web",
            options={"require": ["sub", "sid", "type", "iat", "exp"]},
        )
        if claims["type"] != "access" or not isinstance(claims["sid"], int):
            raise HTTPException(401, "Invalid access token.")
        return claims
    except jwt.InvalidTokenError as exc:
        raise HTTPException(401, "Invalid or expired access token.") from exc
