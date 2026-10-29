"""Server-side Google/Facebook code exchange and browser-bound, one-use flows."""

import base64
import hashlib
import hmac
import secrets
from collections import OrderedDict
from dataclasses import dataclass
from threading import Lock
from time import monotonic
from typing import Any, Literal
from urllib.parse import urlencode
from uuid import uuid4

import httpx
from fastapi import HTTPException
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, NoSuchTableError, ProgrammingError

from app.core.config import Settings
from app.core.security import verify_password
from app.db.oauth import identities
from app.db.repository import Repository
from app.schemas.chat import Register
from app.services.auth import AuthService
from app.services.common import now

Provider = Literal["google", "facebook"]
FLOW_SECONDS = 600


@dataclass(frozen=True)
class Identity:
    """Identity established by a provider response, never browser-submitted fields."""

    subject: str
    email: str
    name: str
    verified: bool


@dataclass(frozen=True)
class Flow:
    """One outstanding authorization, restricted to its initiating browser."""

    provider: Provider
    cookie: str
    verifier: str
    expires: float


@dataclass(frozen=True)
class PendingGoogleLink:
    """Google identity awaiting password proof from its initiating browser."""

    identity: Identity
    cookie: str
    expires: float


class GoogleLinkRequired(HTTPException):
    """Require local account proof before binding a matching Google email."""

    def __init__(self) -> None:
        """Expose no account details through the exception."""
        super().__init__(409, "Confirm existing account ownership.")


class OAuthService:
    """Bound per-process state; the app currently runs one backend worker."""

    def __init__(self, settings: Settings) -> None:
        """Initialize an isolated, bounded flow registry for this app."""
        self.settings = settings
        self.flows: OrderedDict[str, Flow] = OrderedDict()
        self.links: OrderedDict[str, PendingGoogleLink] = OrderedDict()
        self.lock = Lock()

    def pending_google_link(self, identity: Identity) -> tuple[str, str]:
        """Issue a five-minute browser-bound ticket after Google verification."""
        if not identity.verified:
            raise HTTPException(401, "Verified Google identity required.")
        ticket, cookie = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        timestamp = monotonic()
        with self.lock:
            self.links = OrderedDict(
                (key, link)
                for key, link in self.links.items()
                if link.expires > timestamp
            )
            if len(self.links) >= 4096:
                raise HTTPException(429, "Too many pending confirmations.")
            self.links[ticket] = PendingGoogleLink(identity, cookie, timestamp + 300)
        return ticket, cookie

    def consume_google_link(self, ticket: str, cookie: str) -> Identity:
        """Consume the ticket once before checking a local password."""
        with self.lock:
            link = self.links.get(ticket)
            if (
                not link
                or link.expires <= monotonic()
                or not secrets.compare_digest(link.cookie, cookie)
            ):
                raise HTTPException(400, "Invalid or expired account confirmation.")
            del self.links[ticket]
            return link.identity

    def credentials(self, provider: Provider) -> tuple[str, str]:
        """Read confidential provider credentials only on the server."""
        client_id = getattr(self.settings, f"{provider}_client_id")
        secret = getattr(self.settings, f"{provider}_client_secret")
        if (
            not client_id
            or not secret
            or not self.settings.jwt_secret
            or not self.settings.database_configured
        ):
            raise HTTPException(503, "Social login is not configured.")
        return str(client_id), str(secret.get_secret_value())

    def callback(self, provider: Provider) -> str:
        """Use an operator-configured URI, never an untrusted Host or return URL."""
        return f"{self.settings.oauth_public_origin}/api/auth/oauth/{provider}/callback"

    def start(self, provider: Provider) -> tuple[str, str, str]:
        """Create state, browser binding and a PKCE challenge for Google."""
        client_id, _ = self.credentials(provider)
        state, cookie, verifier = (secrets.token_urlsafe(32) for _ in range(3))
        timestamp = monotonic()
        with self.lock:
            self.flows = OrderedDict(
                (key, flow)
                for key, flow in self.flows.items()
                if flow.expires > timestamp
            )
            if len(self.flows) >= 4096:
                raise HTTPException(429, "Too many pending sign-ins.")
            self.flows[state] = Flow(
                provider, cookie, verifier, timestamp + FLOW_SECONDS
            )
        params = {
            "client_id": client_id,
            "redirect_uri": self.callback(provider),
            "response_type": "code",
            "state": state,
        }
        if provider == "google":
            challenge = (
                base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
                .rstrip(b"=")
                .decode()
            )
            params.update(
                scope="openid email profile",
                code_challenge=challenge,
                code_challenge_method="S256",
                prompt="select_account",
            )
            endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
        else:
            params["scope"] = "email,public_profile"
            endpoint = f"https://www.facebook.com/{self.settings.facebook_graph_version}/dialog/oauth"
        return endpoint + "?" + urlencode(params), state, cookie

    def consume(self, provider: Provider, state: str, cookie: str) -> Flow:
        """Reject forged, expired, cross-provider and replayed state before exchange."""
        with self.lock:
            flow = self.flows.get(state)
            if (
                not flow
                or flow.provider != provider
                or flow.expires <= monotonic()
                or not secrets.compare_digest(flow.cookie, cookie)
            ):
                raise HTTPException(400, "Invalid or expired sign-in state.")
            del self.flows[state]
            return flow

    async def identity(self, provider: Provider, code: str, verifier: str) -> Identity:
        """Exchange a code over TLS and validate the identity with the provider."""
        client_id, secret = self.credentials(provider)
        async with httpx.AsyncClient(
            timeout=15, follow_redirects=False, trust_env=False
        ) as client:
            try:
                if provider == "google":
                    token = await client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "code": code,
                            "client_id": client_id,
                            "client_secret": secret,
                            "redirect_uri": self.callback(provider),
                            "grant_type": "authorization_code",
                            "code_verifier": verifier,
                        },
                    )
                    token.raise_for_status()
                    access = token.json()["access_token"]
                    if not isinstance(access, str) or not access:
                        raise ValueError("Invalid provider token")
                    user = await client.get(
                        "https://openidconnect.googleapis.com/v1/userinfo",
                        headers={"Authorization": f"Bearer {access}"},
                    )
                    user.raise_for_status()
                    data = user.json()
                    if data.get("email_verified") is not True:
                        raise HTTPException(401, "A verified Google email is required.")
                    subject, email, name = (
                        data["sub"],
                        data["email"],
                        data.get("name", ""),
                    )
                else:
                    base = f"https://graph.facebook.com/{self.settings.facebook_graph_version}"
                    token = await client.post(
                        base + "/oauth/access_token",
                        data={
                            "code": code,
                            "client_id": client_id,
                            "client_secret": secret,
                            "redirect_uri": self.callback(provider),
                        },
                    )
                    token.raise_for_status()
                    access = token.json()["access_token"]
                    if not isinstance(access, str) or not access:
                        raise ValueError("Invalid provider token")
                    debug = await client.get(
                        base + "/debug_token",
                        params={"input_token": access},
                        headers={"Authorization": f"Bearer {client_id}|{secret}"},
                    )
                    debug.raise_for_status()
                    validation = debug.json()["data"]
                    if (
                        validation.get("is_valid") is not True
                        or str(validation.get("app_id")) != client_id
                    ):
                        raise HTTPException(401, "Invalid Facebook identity.")
                    proof = hmac.new(
                        secret.encode(), access.encode(), hashlib.sha256
                    ).hexdigest()
                    user = await client.get(
                        base + "/me",
                        params={"fields": "id,name,email", "appsecret_proof": proof},
                        headers={"Authorization": f"Bearer {access}"},
                    )
                    user.raise_for_status()
                    data = user.json()
                    subject, email, name = (
                        data["id"],
                        data["email"],
                        data.get("name", ""),
                    )
                    if str(validation.get("user_id")) != subject:
                        raise HTTPException(401, "Invalid Facebook subject.")
                if (
                    not isinstance(subject, str)
                    or not subject
                    or len(subject) > 255
                    or not isinstance(email, str)
                ):
                    raise ValueError("Invalid identity shape")
                # Reuse account email validation, never a provider password.
                candidate = Register(
                    username="oauth-validation",
                    email=email,
                    password=SecretStr("not-a-real-password"),
                    display_name="OAuth",
                )
                return Identity(
                    subject,
                    candidate.email.lower(),
                    str(name)
                    .strip()
                    .encode("utf-16-le")[:120]
                    .decode("utf-16-le", errors="ignore")
                    or "Người học",
                    provider == "google",
                )
            except (
                httpx.HTTPError,
                KeyError,
                ValueError,
                TypeError,
                AttributeError,
            ) as exc:
                raise HTTPException(
                    502, "Provider sign-in failed or email permission is missing."
                ) from exc


def sign_in(
    auth: AuthService, provider: Provider, identity: Identity
) -> dict[str, Any]:
    """Create or find a provider-bound account, never auto-link by matching email."""
    subject_hash = hashlib.sha256(identity.subject.encode()).hexdigest()
    try:
        with auth.db.transaction() as connection:
            repo = Repository(auth.db, connection)
            binding = (
                connection.execute(
                    select(identities).where(
                        identities.c.Provider == provider,
                        identities.c.SubjectHash == subject_hash,
                    )
                )
                .mappings()
                .first()
            )
            if binding:
                auth.db.lock_user(connection, binding["UserId"])
                user = repo.one("Users", UserId=binding["UserId"])
                if user["Status"] != "active":
                    raise HTTPException(401, "Account is unavailable.")
            else:
                if repo.rows("Users", Email=identity.email):
                    if provider == "google":
                        raise GoogleLinkRequired()
                    raise HTTPException(
                        409,
                        "Email already belongs to an account. "
                        "Sign in using its existing method.",
                    )
                user = repo.insert(
                    "Users",
                    Username="social_" + uuid4().hex,
                    Email=identity.email,
                    PasswordHash=None,
                    EmailVerifiedAt=now() if identity.verified else None,
                )
                repo.insert(
                    "LearnerProfiles", UserId=user["UserId"], DisplayName=identity.name
                )
                connection.execute(
                    identities.insert().values(
                        Provider=provider,
                        SubjectHash=subject_hash,
                        UserId=user["UserId"],
                    )
                )
            return auth.issue(repo, user)
    except IntegrityError as exc:
        raise HTTPException(
            409, "Account changed during sign-in. Please try again."
        ) from exc
    except (NoSuchTableError, ProgrammingError) as exc:
        raise HTTPException(503, "Social identity storage is not installed.") from exc


def link_google_identity(
    auth: AuthService, identity: Identity, password: str
) -> dict[str, Any]:
    """Confirm the old password and atomically bind Google without editing data."""
    if not identity.verified:
        raise HTTPException(401, "Verified Google identity required.")
    with auth.db.transaction() as connection:
        repo = Repository(auth.db, connection)
        users = repo.rows("Users", Email=identity.email)
        user = users[0] if users else None
        encoded = user["PasswordHash"] if user else None
    # Do not occupy a pooled database connection during Argon2 verification.
    if not verify_password(password, encoded) or not user or user["Status"] != "active":
        raise HTTPException(401, "Invalid account confirmation.")
    try:
        with auth.db.transaction() as connection:
            auth.db.lock_user(connection, user["UserId"])
            repo = Repository(auth.db, connection)
            current = repo.one("Users", UserId=user["UserId"])
            if (
                current["PasswordHash"] != encoded
                or current["Status"] != "active"
                or current["Email"].lower() != identity.email
            ):
                raise HTTPException(401, "Account changed during confirmation.")
            connection.execute(
                identities.insert().values(
                    Provider="google",
                    SubjectHash=hashlib.sha256(identity.subject.encode()).hexdigest(),
                    UserId=current["UserId"],
                )
            )
            return auth.issue(repo, current)
    except IntegrityError as exc:
        raise HTTPException(
            409, "Account or Google identity is already linked."
        ) from exc
