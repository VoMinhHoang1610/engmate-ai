"""Transactional password accounts, revocable JWT sessions and password reset."""

import logging
import secrets
import smtplib
from datetime import timedelta
from email.message import EmailMessage
from typing import Protocol
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
from app.schemas.learning import AccountUpdate, Login, Register
from app.services.common import now, public

LOGGER = logging.getLogger(__name__)


class Mailer(Protocol):
    """Delivery is injected so tests never send messages to real people."""

    def send_reset(self, email: str, token: str) -> None:
        """Deliver a reset link without returning the token to API clients."""
        ...


class SMTPMailer:
    """Optional TLS SMTP delivery configured by the application operator."""

    def __init__(self, settings: Settings) -> None:
        """Store connection settings; do not connect until a reset is requested."""
        self.settings = settings

    def send_reset(self, email: str, token: str) -> None:
        """Send only via an explicitly configured mail server."""
        settings = self.settings
        if not settings.smtp_host or not settings.smtp_sender:
            raise HTTPException(503, "Password reset email is not configured.")
        message = EmailMessage()
        message["Subject"] = "EngMate-AI password reset"
        message["From"] = settings.smtp_sender
        message["To"] = email
        message.set_content(settings.frontend_url + "/#dang-nhap?reset-token=" + token)
        try:
            with smtplib.SMTP(
                settings.smtp_host, settings.smtp_port, timeout=10
            ) as smtp:
                smtp.starttls()
                if settings.smtp_username and settings.smtp_password:
                    smtp.login(
                        settings.smtp_username,
                        settings.smtp_password.get_secret_value(),
                    )
                smtp.send_message(message)
        except (OSError, smtplib.SMTPException) as exc:
            raise HTTPException(
                503, "Email delivery is temporarily unavailable."
            ) from exc


class AuthService:
    """Own identity and token lifecycles; no secrets are serialized in responses."""

    def __init__(self, database: Database, settings: Settings, mailer: Mailer) -> None:
        """Bind dependencies without opening a connection."""
        self.db, self.settings, self.mailer = database, settings, mailer

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
            repo.insert("UserSettings", UserId=user["UserId"])
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

    def change_password(self, user: Record, current: str, new_password: str) -> None:
        """Change the hash and revoke all sessions as one transaction."""
        password_hash = hash_password(new_password)
        with self.db.transaction() as connection:
            self.db.lock_user(connection, user["UserId"])
            repo = Repository(self.db, connection)
            stored = repo.one("Users", UserId=user["UserId"])
            if not verify_password(current, stored["PasswordHash"]):
                raise HTTPException(401, "Current password is incorrect.")
            repo.update(
                "Users",
                {"UserId": user["UserId"]},
                {"PasswordHash": password_hash, "UpdatedAt": now()},
            )
            table = self.db.models.table("AuthSessions", connection)
            connection.execute(
                table.update()
                .where(table.c.UserId == user["UserId"], table.c.RevokedAt.is_(None))
                .values(RevokedAt=now())
            )

    def update_account(self, user: Record, data: AccountUpdate) -> Record:
        """Protect account edits and invalidate reset links sent to the old address."""
        with self.db.transaction() as connection:
            self.db.lock_user(connection, user["UserId"])
            repo = Repository(self.db, connection)
            stored = repo.one("Users", UserId=user["UserId"])
            if not verify_password(
                data.current_password.get_secret_value(), stored["PasswordHash"]
            ):
                raise HTTPException(401, "Current password is incorrect.")
            values: Record = {
                "Username": data.username.lower(),
                "Email": data.email.lower(),
                "UpdatedAt": now(),
            }
            if data.email.lower() != stored["Email"].lower():
                values["EmailVerifiedAt"] = None
                tokens = self.db.models.table("AccountTokens", connection)
                connection.execute(
                    tokens.update()
                    .where(tokens.c.UserId == user["UserId"], tokens.c.UsedAt.is_(None))
                    .values(UsedAt=now())
                )
            updated = repo.update(
                "Users",
                {
                    "UserId": user["UserId"],
                    "Version": self.db.version_value(data.version),
                },
                values,
            )
            return self.user_public(updated)

    def forgot_password(self, email: str) -> None:
        """Store a single-use token; delivery happens outside the transaction."""
        if isinstance(self.mailer, SMTPMailer) and (
            not self.settings.smtp_host or not self.settings.smtp_sender
        ):
            raise HTTPException(503, "Password reset email is not configured.")
        token = secrets.token_urlsafe(48)
        recipient: str | None = None
        with self.db.transaction() as connection:
            repo = Repository(self.db, connection)
            users = repo.rows("Users", Email=email.lower(), Status="active")
            if users and users[0]["PasswordHash"]:
                recipient = users[0]["Email"]
                repo.insert(
                    "AccountTokens",
                    UserId=users[0]["UserId"],
                    Purpose="reset_password",
                    TokenHash=token_hash(token),
                    ExpiresAt=now() + timedelta(minutes=20),
                )
        if recipient is not None:
            try:
                self.mailer.send_reset(recipient, token)
            except HTTPException as exc:
                if exc.status_code != 503:
                    raise
                # A different HTTP response would reveal whether the email exists.
                LOGGER.warning("Password-reset email delivery is unavailable.")

    def reset_password(self, token: str, new_password: str) -> None:
        """Consume a token under the owner lock and revoke every old session."""
        password_hash = hash_password(new_password)
        with self.db.transaction() as connection:
            repo = Repository(self.db, connection)
            matches = repo.rows(
                "AccountTokens", TokenHash=token_hash(token), Purpose="reset_password"
            )
            if not matches:
                raise HTTPException(400, "Invalid or expired reset token.")
            self.db.lock_user(connection, matches[0]["UserId"])
            stored = repo.one(
                "AccountTokens", AccountTokenId=matches[0]["AccountTokenId"]
            )
            user = repo.one("Users", UserId=stored["UserId"])
            if (
                stored["UsedAt"] is not None
                or stored["ExpiresAt"] <= now()
                or user["Status"] != "active"
            ):
                raise HTTPException(400, "Invalid or expired reset token.")
            repo.update(
                "AccountTokens",
                {"AccountTokenId": stored["AccountTokenId"]},
                {"UsedAt": now()},
            )
            repo.update(
                "Users",
                {"UserId": stored["UserId"]},
                {"PasswordHash": password_hash, "UpdatedAt": now()},
            )
            table = self.db.models.table("AuthSessions", connection)
            connection.execute(
                table.update()
                .where(table.c.UserId == stored["UserId"], table.c.RevokedAt.is_(None))
                .values(RevokedAt=now())
            )
