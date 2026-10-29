"""Social sign-in boundaries with provider HTTP and database doubles only."""

from dataclasses import replace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    LargeBinary,
    MetaData,
    String,
    Table,
    create_engine,
    select,
)
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.db.database import Database
from app.db.learning import metadata as learning_metadata
from app.db.learning import progress as learning_progress
from app.db.oauth import identities
from app.db.oauth import metadata as oauth_metadata
from app.main import create_app
from app.schemas.chat import Register
from app.services.auth import AuthService
from app.services.oauth import (
    GoogleLinkRequired,
    Identity,
    OAuthService,
    Provider,
    link_google_identity,
    sign_in,
)


def config() -> Settings:
    """Return isolated credentials that never authenticate to a real provider."""
    return Settings(
        database_odbc_connection=SecretStr("test-only"),
        jwt_secret=SecretStr("isolated-oauth-test-secret-longer-than-32"),
        google_client_id="google-test",
        google_client_secret=SecretStr("google-secret"),
        facebook_client_id="facebook-test",
        facebook_client_secret=SecretStr("fb-secret"),
    )


def test_state_binding_expiry_provider_and_replay() -> None:
    """State requires the initiating cookie and correct provider, and is one-use."""
    service = OAuthService(config())
    url, state, cookie = service.start("google")
    params = parse_qs(urlparse(url).query)
    assert params["code_challenge_method"] == ["S256"]
    assert params["scope"] == ["openid email profile"]
    attempts: list[tuple[Provider, str]] = [("google", "forged"), ("facebook", cookie)]
    for provider, value in attempts:
        with pytest.raises(HTTPException):
            service.consume(provider, state, value)
    flow = service.consume("google", state, cookie)
    assert flow.verifier and flow.verifier not in url
    with pytest.raises(HTTPException):
        service.consume("google", state, cookie)
    _, state, cookie = service.start("facebook")
    service.flows[state] = replace(service.flows[state], expires=0)
    with pytest.raises(HTTPException):
        service.consume("facebook", state, cookie)


def test_google_link_ticket_is_browser_bound_expiring_and_single_use() -> None:
    """A matching email alone cannot supply the provider identity or browser proof."""
    service = OAuthService(config())
    identity = Identity("subject", "learner@example.test", "Learner", True)
    ticket, cookie = service.pending_google_link(identity)
    with pytest.raises(HTTPException):
        service.consume_google_link(ticket, "forged-cookie")
    assert service.consume_google_link(ticket, cookie) == identity
    with pytest.raises(HTTPException):
        service.consume_google_link(ticket, cookie)
    ticket, cookie = service.pending_google_link(identity)
    service.links[ticket] = replace(service.links[ticket], expires=0)
    with pytest.raises(HTTPException):
        service.consume_google_link(ticket, cookie)
    with pytest.raises(HTTPException):
        service.pending_google_link(replace(identity, verified=False))


@pytest.mark.anyio
@pytest.mark.parametrize("provider", ["google", "facebook"])
async def test_provider_exchange(
    monkeypatch: pytest.MonkeyPatch, provider: Any
) -> None:
    """Exchange code server-side and verify app/subject/email before account access."""
    requests: list[httpx.Request] = []
    original = httpx.AsyncClient

    def reply(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("/token") or request.url.path.endswith(
            "/access_token"
        ):
            assert request.method == "POST"
            assert b"code=test-code" in request.content
            return httpx.Response(200, json={"access_token": "provider-token"})
        if request.url.path.endswith("/debug_token"):
            return httpx.Response(
                200,
                json={
                    "data": {
                        "is_valid": True,
                        "app_id": "facebook-test",
                        "user_id": "subject-1",
                    }
                },
            )
        assert request.headers["Authorization"] == "Bearer provider-token"
        return httpx.Response(
            200,
            json={
                "sub": "subject-1",
                "id": "subject-1",
                "email": "Learner@example.test",
                "name": "Learner",
                "email_verified": True,
            },
        )

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: original(**kwargs, transport=httpx.MockTransport(reply)),
    )
    identity = await OAuthService(config()).identity(provider, "test-code", "verifier")
    assert identity.email == "learner@example.test"
    assert identity.subject == "subject-1"
    assert len(requests) == (2 if provider == "google" else 3)


@pytest.mark.anyio
@pytest.mark.parametrize("provider", ["google", "facebook"])
async def test_rejects_unverified_or_wrong_app(
    monkeypatch: pytest.MonkeyPatch, provider: Any
) -> None:
    """No identity is issued from unverified email or a different Facebook app."""
    original = httpx.AsyncClient

    def reply(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(200, json={"access_token": "provider-token"})
        return httpx.Response(
            200,
            json={
                "email_verified": False,
                "data": {"is_valid": True, "app_id": "other-app"},
            },
        )

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: original(**kwargs, transport=httpx.MockTransport(reply)),
    )
    with pytest.raises(HTTPException) as error:
        await OAuthService(config()).identity(provider, "test-code", "verifier")
    assert error.value.status_code == 401


@pytest.mark.anyio
async def test_routes_cookie_csrf_cancel_and_callback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Bind popup results to the exact origin/state, without tokens in URLs."""
    app = create_app(config())
    exchange = AsyncMock(
        return_value=Identity("subject", "learner@example.test", "Learner", True)
    )
    monkeypatch.setattr(app.state.oauth, "identity", exchange)
    monkeypatch.setattr(
        "app.api.oauth_routes.sign_in",
        lambda *_: {"access_token": "app-access", "refresh_token": "app-refresh"},
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:5174"
    ) as client:
        assert (
            await client.post(
                "/api/auth/oauth/google/start",
                headers={"Origin": "https://evil.example"},
            )
        ).status_code == 403
        start = await client.post(
            "/api/auth/oauth/google/start", headers={"Origin": "http://127.0.0.1:5174"}
        )
        assert start.status_code == 200
        assert "HttpOnly" in start.headers["set-cookie"]
        assert "SameSite=lax" in start.headers["set-cookie"]
        state = start.json()["state"]
        callback = await client.get(
            "/api/auth/oauth/google/callback",
            params={"state": state, "code": "test-code"},
        )
        assert callback.status_code == 200
        assert "app-access" in callback.text
        assert "http://127.0.0.1:5174" in callback.text
        assert "frame-ancestors 'none'" in callback.headers["content-security-policy"]
        assert callback.headers["referrer-policy"] == "no-referrer"
        replay = await client.get(
            "/api/auth/oauth/google/callback",
            params={"state": state, "code": "test-code"},
        )
        assert "app-access" not in replay.text
        exchange.assert_awaited_once()
        start = await client.post(
            "/api/auth/oauth/facebook/start",
            headers={"Origin": "http://127.0.0.1:5174"},
        )
        cancelled = await client.get(
            "/api/auth/oauth/facebook/callback",
            params={"state": start.json()["state"], "error": "access_denied"},
        )
        assert "tokens" not in cancelled.text
        assert (await client.post("/api/auth/oauth/github/start")).status_code == 422

        def unavailable(*_args: Any) -> dict[str, Any]:
            raise OperationalError("", {}, Exception("private database error"))

        monkeypatch.setattr("app.api.oauth_routes.sign_in", unavailable)
        start = await client.post(
            "/api/auth/oauth/google/start",
            headers={"Origin": "http://127.0.0.1:5174"},
        )
        failed = await client.get(
            "/api/auth/oauth/google/callback",
            params={"state": start.json()["state"], "code": "new-code"},
        )
        assert "private database error" not in failed.text
        assert "tokens" not in failed.text


def test_missing_credentials() -> None:
    """Missing credentials fail explicitly rather than imitating a successful login."""
    from app.core.config import Settings

    with pytest.raises(HTTPException) as error:
        OAuthService(Settings()).start("google")
    assert error.value.status_code == 503


@pytest.mark.anyio
async def test_google_confirmation_route_requires_cookie_origin_and_single_use(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A browser ticket plus password confirmation is needed before token delivery."""
    app = create_app(config())
    identity = Identity("subject", "learner@example.test", "Learner", True)
    monkeypatch.setattr(app.state.oauth, "identity", AsyncMock(return_value=identity))

    def requires_link(*_args: Any) -> dict[str, Any]:
        raise GoogleLinkRequired()

    monkeypatch.setattr("app.api.oauth_routes.sign_in", requires_link)
    tokens: dict[str, Any] = {
        "access_token": "access",
        "refresh_token": "refresh",
        "token_type": "bearer",
        "expires_in": 900,
        "user": {
            "public_id": str(uuid4()),
            "username": "existing",
            "email": identity.email,
            "status": "active",
            "email_verified_at": None,
            "version": "0000000000000001",
        },
    }
    confirm = MagicMock(return_value=tokens)
    monkeypatch.setattr("app.api.oauth_routes.link_google_identity", confirm)
    base = "http://127.0.0.1:5174"
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url=base
    ) as client:
        start = await client.post(
            "/api/auth/oauth/google/start", headers={"Origin": base}
        )
        callback = await client.get(
            "/api/auth/oauth/google/callback",
            params={"state": start.json()["state"], "code": "code"},
        )
        assert '"link_ticket"' in callback.text
        assert '"tokens"' not in callback.text
        assert "engmate_google_link=" in callback.headers["set-cookie"]
        assert "HttpOnly" in callback.headers["set-cookie"]
        ticket = next(iter(app.state.oauth.links))
        body = {"ticket": ticket, "password": "local-password"}
        bad_origin = await client.post(
            "/api/auth/oauth/google/link",
            headers={"Origin": "https://evil.example"},
            json=body,
        )
        assert bad_origin.status_code == 403
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url=base
        ) as other:
            assert (
                await other.post(
                    "/api/auth/oauth/google/link", headers={"Origin": base}, json=body
                )
            ).status_code == 400
        confirm.assert_not_called()
        response = await client.post(
            "/api/auth/oauth/google/link", headers={"Origin": base}, json=body
        )
        assert response.status_code == 200
        assert response.json()["user"]["public_id"] == tokens["user"]["public_id"]
        assert confirm.call_args.args[1:] == (identity, "local-password")
        assert (
            await client.post(
                "/api/auth/oauth/google/link", headers={"Origin": base}, json=body
            )
        ).status_code == 400
        confirm.assert_called_once()


def test_identity_account_transaction_and_no_email_autolinking() -> None:
    """Use an in-memory SQL database to verify account/session/binding writes."""
    schema = MetaData()
    users = Table(
        "Users",
        schema,
        Column("UserId", Integer, primary_key=True),
        Column("PublicId", String, default=lambda: str(uuid4())),
        Column("Username", String, unique=True),
        Column("Email", String, unique=True),
        Column("PasswordHash", String, nullable=True),
        Column("Status", String, default="active"),
        Column("EmailVerifiedAt", DateTime, nullable=True),
        Column("Version", Integer, default=1),
    )
    Table(
        "LearnerProfiles",
        schema,
        Column("UserId", Integer, primary_key=True),
        Column("DisplayName", String),
    )
    sessions = Table(
        "AuthSessions",
        schema,
        Column("AuthSessionId", Integer, primary_key=True),
        Column("UserId", Integer),
        Column("RefreshTokenHash", LargeBinary),
        Column("ExpiresAt", DateTime),
    )
    engine = create_engine("sqlite://")
    schema.create_all(engine)
    oauth_metadata.create_all(engine)
    learning_metadata.create_all(engine)
    database = MagicMock(spec=Database)
    database.mysql = True
    database.models = MagicMock()
    database.models.table.side_effect = lambda name, _connection: schema.tables[name]
    database.transaction.side_effect = engine.begin
    service = AuthService(database, config())
    identity = Identity("google-subject", "learner@example.test", "Learner", True)
    try:
        first = sign_in(service, "google", identity)
        second = sign_in(service, "google", replace(identity, name="Different"))
        assert first["user"]["public_id"] == second["user"]["public_id"]
        assert first["refresh_token"] != second["refresh_token"]
        with engine.begin() as connection:
            account = connection.execute(select(users)).mappings().one()
            assert account["PasswordHash"] is None
            assert (
                connection.execute(select(identities)).mappings().one()["UserId"]
                == account["UserId"]
            )
            assert len(connection.execute(select(sessions)).all()) == 2
        for provider in ("google", "facebook"):
            with pytest.raises(HTTPException) as collision:
                sign_in(
                    service, provider, replace(identity, subject="different-subject")
                )
            assert collision.value.status_code == 409
        with engine.begin() as connection:
            connection.execute(users.update().values(Status="disabled"))
        with pytest.raises(HTTPException) as disabled:
            sign_in(service, "google", identity)
        assert disabled.value.status_code == 401

        password = "existing-local-password"
        original = service.register(
            Register(
                username="existing",
                email="existing@example.test",
                password=SecretStr(password),
                display_name="Existing name",
            )
        )
        google = Identity(
            "existing-google-subject", "existing@example.test", "New Google name", True
        )
        with pytest.raises(GoogleLinkRequired):
            sign_in(service, "google", google)
        with engine.begin() as connection:
            old_user = dict(
                connection.execute(select(users).where(users.c.Email == google.email))
                .mappings()
                .one()
            )
            old_profile = dict(
                connection.execute(
                    select(schema.tables["LearnerProfiles"]).where(
                        schema.tables["LearnerProfiles"].c.UserId == old_user["UserId"]
                    )
                )
                .mappings()
                .one()
            )
            connection.execute(
                learning_progress.insert().values(
                    UserId=old_user["UserId"],
                    LessonId="foundation-01",
                    ConversationId=None,
                    Phase=4,
                    Completed=True,
                    CheckCorrect=2,
                    CheckTotal=2,
                    ReviewDue=None,
                )
            )
            saved_progress = dict(
                connection.execute(select(learning_progress)).mappings().one()
            )
            session_count = len(connection.execute(select(sessions)).all())
        with pytest.raises(HTTPException) as wrong:
            link_google_identity(service, google, "incorrect-password")
        assert wrong.value.status_code == 401
        with engine.begin() as connection:
            assert len(connection.execute(select(sessions)).all()) == session_count
            assert not connection.execute(
                select(identities).where(identities.c.UserId == old_user["UserId"])
            ).first()
        with patch.object(
            service, "issue", side_effect=RuntimeError("session failure")
        ):
            with pytest.raises(RuntimeError):
                link_google_identity(service, google, password)
        with engine.begin() as connection:
            assert not connection.execute(
                select(identities).where(identities.c.UserId == old_user["UserId"])
            ).first()
        linked = link_google_identity(service, google, password)
        assert linked["user"]["public_id"] == original["user"]["public_id"]
        assert (
            sign_in(service, "google", google)["user"]["public_id"]
            == original["user"]["public_id"]
        )
        with engine.begin() as connection:
            assert (
                dict(
                    connection.execute(
                        select(users).where(users.c.UserId == old_user["UserId"])
                    )
                    .mappings()
                    .one()
                )
                == old_user
            )
            assert (
                dict(
                    connection.execute(
                        select(schema.tables["LearnerProfiles"]).where(
                            schema.tables["LearnerProfiles"].c.UserId
                            == old_user["UserId"]
                        )
                    )
                    .mappings()
                    .one()
                )
                == old_profile
            )
            assert (
                dict(connection.execute(select(learning_progress)).mappings().one())
                == saved_progress
            )
    finally:
        engine.dispose()
