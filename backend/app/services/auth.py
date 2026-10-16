"""Transactional password accounts with revocable JWT sessions."""

import secrets
from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_, select

from app.core.config import Settings
from app.core.security import (
    access_token,
    decode_access,
    hash_password,
    token_hash,
    verify_password,
)
from app.db.database import Database, Record
from app.db.repository import Repository
from app.schemas.chat import Login, Register
from app.services.common import now, public


class AuthService:
    """Own identity and token lifecycles without serializing secrets."""

    def __init__(self, database: Database, settings: Settings) -> None:
        """Bind the shared database and signing configuration."""
        self.db, self.settings = database, settings

    def issue(self, repo: Repository, user: Record) -> Record:
        """Persist a hashed refresh token and return one revocable token pair."""
        refresh = secrets.token_urlsafe(48)
        session = repo.insert(
            "AuthSessions",
            UserId=user["UserId"],
            RefreshTokenHash=token_hash(refresh),
            ExpiresAt=now() + timedelta(days=self.settings.refresh_token_days),
        )
        return {
            "access_token": access_token(
                self.settings, str(user["PublicId"]), session["AuthSessionId"]
            ),
            "refresh_token": refresh,
            "token_type": "bearer",
            "expires_in": self.settings.access_token_minutes * 60,
            "user": self.user_public(user),
        }

    @staticmethod
    def user_public(user: Record) -> Record:
        """Expose only intended account fields, never hashes or internal metadata."""
        return public(
            {
                key: user[key]
                for key in (
                    "PublicId",
                    "Username",
                    "Email",
                    "Status",
                    "EmailVerifiedAt",
                    "Version",
                )
            }
        )

    def register(self, data: Register) -> Record:
        """Create account/profile/preferences in one rollback-safe transaction."""
        password = hash_password(data.password.get_secret_value())
        with self.db.transaction() as connection:
            repo = Repository(self.db, connection)
            user = repo.insert(
                "Users",
                Username=data.username.lower(),
                Email=data.email.lower(),
                PasswordHash=password,
            )
            repo.insert(
                "LearnerProfiles", UserId=user["UserId"], DisplayName=data.display_name
            )
            return self.issue(repo, user)

    def login(self, data: Login) -> Record:
        """Return the same error for unknown, disabled and wrong-password users."""
        with self.db.transaction() as connection:
            table = self.db.models.table("Users", connection)
            row = (
                connection.execute(
                    select(table).where(
                        or_(
                            table.c.Username == data.identifier,
                            table.c.Email == data.identifier,
                        )
                    )
                )
                .mappings()
                .first()
            )
            user = dict(row) if row else None
            encoded = user["PasswordHash"] if user else None
            if (
                not verify_password(data.password.get_secret_value(), encoded)
                or not user
                or user["Status"] != "active"
            ):
                raise HTTPException(401, "Invalid username/email or password.")
            self.db.lock_user(connection, user["UserId"])
            repo = Repository(self.db, connection)
            current = repo.one("Users", UserId=user["UserId"])
            if current["PasswordHash"] != encoded or current["Status"] != "active":
                raise HTTPException(401, "Invalid username/email or password.")
            return self.issue(repo, current)

    def authenticate(self, token: str) -> Record:
        """Enforce revocation immediately, including logout and password reset."""
        claims = decode_access(self.settings, token)
        try:
            subject = UUID(claims["sub"])
        except (ValueError, TypeError) as exc:
            raise HTTPException(401, "Invalid access token.") from exc
        with self.db.transaction() as connection:
            repo = Repository(self.db, connection)
            users = repo.rows("Users", PublicId=subject, Status="active")
            if not users:
                raise HTTPException(401, "Account is unavailable.")
            user = users[0]
            sessions = repo.rows(
                "AuthSessions", AuthSessionId=claims["sid"], UserId=user["UserId"]
            )
            if (
                not sessions
                or sessions[0]["RevokedAt"] is not None
                or sessions[0]["ExpiresAt"] <= now()
            ):
                raise HTTPException(401, "Session has expired or been revoked.")
            return {**user, "SessionId": claims["sid"]}

    def refresh(self, token: str) -> Record:
        """Serialize token rotation and reject consumed/expired refresh tokens."""
        with self.db.transaction() as connection:
            repo = Repository(self.db, connection)
            sessions = repo.rows("AuthSessions", RefreshTokenHash=token_hash(token))
            if not sessions:
                raise HTTPException(401, "Invalid refresh token.")
            self.db.lock_user(connection, sessions[0]["UserId"])
            session = repo.one(
                "AuthSessions", AuthSessionId=sessions[0]["AuthSessionId"]
            )
            if session["RevokedAt"] is not None or session["ExpiresAt"] <= now():
                raise HTTPException(401, "Refresh token is expired or already used.")
            user = repo.one("Users", UserId=session["UserId"])
            if user["Status"] != "active":
                raise HTTPException(401, "Account is unavailable.")
            repo.update(
                "AuthSessions",
                {"AuthSessionId": session["AuthSessionId"]},
                {"RevokedAt": now()},
            )
            return self.issue(repo, user)

    def logout(self, user: Record, all_sessions: bool = False) -> None:
        """Revoke only sessions belonging to the authenticated caller."""
        with self.db.transaction() as connection:
            self.db.lock_user(connection, user["UserId"])
            table = self.db.models.table("AuthSessions", connection)
            statement = table.update().where(
                table.c.UserId == user["UserId"], table.c.RevokedAt.is_(None)
            )
            if not all_sessions:
                statement = statement.where(table.c.AuthSessionId == user["SessionId"])
            connection.execute(statement.values(RevokedAt=now()))
