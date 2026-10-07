"""Real SQL Server API workflows inside tempdb transactions, always rolled back."""

import io
import os
import wave
from collections.abc import AsyncIterator, Iterator
from typing import Any
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from PIL import Image
from pydantic import SecretStr
from sqlalchemy import Connection, create_engine, text
from sqlalchemy.engine import URL

from app.core.config import Settings
from app.db.database import Database
from app.db.migrate import apply_scripts
from app.db.repository import Repository
from app.llm.mock import MockLLMClient
from app.main import create_app
from app.schemas.ai import Level
from app.schemas.learning import MessageCreate
from app.services.conversations import ConversationService, PendingTurn
from app.services.practice import PracticeService

pytestmark = pytest.mark.anyio
CONNECTION = os.getenv("SQLSERVER_TEST_ODBC_CONNECTION")
PASSWORD = "test-password-123"


class TestMailer:
    """Record test reset tokens without sending email or exposing HTTP tokens."""

    __test__ = False

    def __init__(self) -> None:
        """Initialize an isolated outbox."""
        self.messages: list[tuple[str, str]] = []

    def send_reset(self, email: str, token: str) -> None:
        """Store delivery for single-use-token assertions."""
        self.messages.append((email, token))


@pytest.fixture(scope="module")
def sql_connection() -> Iterator[Connection]:
    """Refuse non-tempdb/nonempty schema; outer rollback removes all test DDL/data."""
    if not CONNECTION:
        pytest.skip(
            "Set SQLSERVER_TEST_ODBC_CONNECTION for rollback-only SQL Server tests."
        )
    engine = create_engine(
        URL.create("mssql+pyodbc", query={"odbc_connect": CONNECTION}),
        hide_parameters=True,
    )
    try:
        with engine.connect() as connection:
            outer = connection.begin()
            try:
                assert (
                    connection.execute(text("SELECT DB_NAME()")).scalar_one()
                    == "tempdb"
                ), "Tests must target tempdb."
                assert (
                    connection.execute(text("SELECT SCHEMA_ID(N'em')")).scalar_one()
                    is None
                ), "Tests require absent em schema."
                apply_scripts(connection)
                connection.exec_driver_sql("SET XACT_ABORT OFF;")
                yield connection
            finally:
                outer.rollback()
    finally:
        engine.dispose()


@pytest.fixture
def sql_database(sql_connection: Connection) -> Iterator[Database]:
    """Roll back each workflow while keeping the module's catalogue DDL available."""
    transaction = sql_connection.begin_nested()
    try:
        yield Database(
            Settings(
                jwt_secret=SecretStr("test-only-signing-secret-at-least-32-characters")
            ),
            sql_connection,
        )
    finally:
        transaction.rollback()


@pytest.fixture
def mailer() -> TestMailer:
    """Isolate captured mail deliveries per workflow."""
    return TestMailer()


@pytest.fixture
async def sql_client(
    sql_database: Database, mailer: TestMailer, tmp_path: Any
) -> AsyncIterator[AsyncClient]:
    """Inject the real SQL connection and private temporary asset storage into HTTP."""
    config = sql_database.settings.model_copy(update={"media_directory": tmp_path})
    application = create_app(config, sql_database, mailer)
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://testserver"
    ) as client:
        yield client


async def account(client: AsyncClient, name: str = "learner") -> dict[str, Any]:
    """Register an actual password account and set its access bearer."""
    response = await client.post(
        "/api/auth/register",
        json={
            "username": name,
            "email": name + "@example.test",
            "password": PASSWORD,
            "display_name": "Learner",
        },
    )
    assert response.status_code == 201, response.text
    data: dict[str, Any] = response.json()
    client.headers["Authorization"] = "Bearer " + data["access_token"]
    return data


async def test_auth_sessions(sql_client: AsyncClient) -> None:
    """Passwords remain private, refresh rotates, and logout revokes JWT access."""
    data = await account(sql_client)
    assert "password" not in str(data).lower()
    assert (await sql_client.get("/api/me")).json()["username"] == "learner"
    duplicate = await sql_client.post(
        "/api/auth/register",
        json={
            "username": "LEARNER",
            "email": "second@example.test",
            "password": PASSWORD,
            "display_name": "Second",
        },
    )
    assert duplicate.status_code == 409
    bad = await sql_client.post(
        "/api/auth/login", json={"identifier": "learner", "password": "wrong"}
    )
    assert bad.status_code == 401
    response = await sql_client.post(
        "/api/auth/login",
        json={"identifier": "LEARNER@EXAMPLE.TEST", "password": PASSWORD},
    )
    assert response.status_code == 200
    rotated = await sql_client.post(
        "/api/auth/refresh", json={"refresh_token": data["refresh_token"]}
    )
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != data["refresh_token"]
    assert (await sql_client.get("/api/me")).status_code == 401
    assert (
        await sql_client.post(
            "/api/auth/refresh", json={"refresh_token": data["refresh_token"]}
        )
    ).status_code == 401
    sql_client.headers["Authorization"] = "Bearer " + rotated.json()["access_token"]
    assert (await sql_client.post("/api/auth/logout")).status_code == 204
    assert (await sql_client.get("/api/me")).status_code == 401


async def test_reset_password(sql_client: AsyncClient, mailer: TestMailer) -> None:
    """Reset links are delivered only to mailer; consumption revokes old sessions."""
    await account(sql_client)
    response = await sql_client.post(
        "/api/auth/forgot-password", json={"email": "learner@example.test"}
    )
    missing = await sql_client.post(
        "/api/auth/forgot-password", json={"email": "absent@example.test"}
    )
    assert response.status_code == missing.status_code == 202
    assert response.json() == missing.json()
    token = mailer.messages[0][1]
    assert token not in response.text
    reset = {"token": token, "new_password": "replacement-password-123"}
    assert (
        await sql_client.post("/api/auth/reset-password", json=reset)
    ).status_code == 204
    assert (await sql_client.get("/api/me")).status_code == 401
    assert (
        await sql_client.post("/api/auth/reset-password", json=reset)
    ).status_code == 400
    assert (
        await sql_client.post(
            "/api/auth/login", json={"identifier": "learner", "password": PASSWORD}
        )
    ).status_code == 401
    assert (
        await sql_client.post(
            "/api/auth/login",
            json={"identifier": "learner", "password": reset["new_password"]},
        )
    ).status_code == 200


async def test_reset_delivery_does_not_reveal_accounts(
    sql_client: AsyncClient, mailer: TestMailer, monkeypatch: pytest.MonkeyPatch
) -> None:
    """SMTP transport failure keeps the same HTTP response for known/unknown emails."""
    await account(sql_client)

    def fail(email: str, token: str) -> None:
        """Simulate a configured mail server being offline."""
        raise HTTPException(503, "Private SMTP connection failure")

    monkeypatch.setattr(mailer, "send_reset", fail)
    known = await sql_client.post(
        "/api/auth/forgot-password", json={"email": "learner@example.test"}
    )
    unknown = await sql_client.post(
        "/api/auth/forgot-password", json={"email": "unknown@example.test"}
    )
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()


async def test_unsupported_sql_levels_are_rejected_without_writes(
    sql_client: AsyncClient,
) -> None:
    """UI/mock levels beyond SQL v1 return 422 and preserve stored learner data."""
    await account(sql_client)
    profile = (await sql_client.get("/api/me/profile")).json()
    for level in ("Pre-A1", "A1", "C1", "C2"):
        update = await sql_client.put(
            "/api/me/profile",
            json={
                "version": profile["version"],
                "display_name": "Unsupported level",
                "cefr_level": level,
            },
        )
        conversation = await sql_client.post(
            "/api/conversations",
            json={"client_request_id": str(uuid4()), "level": level},
        )
        assert update.status_code == conversation.status_code == 422
        assert (await sql_client.get("/api/me/profile")).json() == profile
        assert (await sql_client.get("/api/conversations")).json() == []


async def test_profile_preferences(sql_client: AsyncClient) -> None:
    """Persist UI fields while rejecting stale versions and forged owners."""
    await account(sql_client)
    profile = (await sql_client.get("/api/me/profile")).json()
    payload = {
        "version": profile["version"],
        "display_name": "New name",
        "cefr_level": "B1",
        "daily_goal_minutes": 30,
        "time_zone_id": "Asia/Ho_Chi_Minh",
    }
    updated = await sql_client.put("/api/me/profile", json=payload)
    assert updated.status_code == 200, updated.text
    assert updated.json()["display_name"] == "New name"
    assert updated.json()["version"] != profile["version"]
    assert (await sql_client.put("/api/me/profile", json=payload)).status_code == 409
    assert (
        await sql_client.put("/api/me/profile", json={**payload, "user_id": 999})
    ).status_code == 422
    assert (
        await sql_client.put(
            "/api/me/profile", json={**payload, "time_zone_id": "invalid"}
        )
    ).status_code == 422
    settings = (await sql_client.get("/api/me/settings")).json()
    preferences = {
        "version": settings["version"],
        "theme": "dark",
        "reduced_motion": True,
        "speech_rate": 1.25,
    }
    assert (await sql_client.put("/api/me/settings", json=preferences)).json()[
        "theme"
    ] == "dark"
    assert (
        await sql_client.put("/api/me/settings", json=preferences)
    ).status_code == 409


async def test_catalogue_readiness(sql_client: AsyncClient) -> None:
    """Catalogue counts match SQL seed; exercise retrieval never exposes answer keys."""
    response = await sql_client.get("/api/ready")
    assert response.status_code == 200, response.text
    assert len((await sql_client.get("/api/topics")).json()) == 8
    lessons = (await sql_client.get("/api/lessons")).json()
    assert len(lessons) == 9
    assert len((await sql_client.get("/api/lessons?skill=writing&limit=1")).json()) == 1
    listening = next(row for row in lessons if row["skill"] == "listening")
    lesson = (await sql_client.get(f"/api/lessons/{listening['lesson_id']}")).json()
    assert len(lesson["questions"]) == 2
    assert "expected_text" not in str(lesson)
    assert "is_correct" not in str(lesson)
    assert (await sql_client.get("/api/lessons/999999")).status_code == 404


async def test_vocabulary_cards_statistics(sql_client: AsyncClient) -> None:
    """Deduplicate review credits and preserve historic reviews after archive."""
    await account(sql_client)
    word = (
        await sql_client.post(
            "/api/vocabulary", json={"word": "hello", "meaning": "xin chào"}
        )
    ).json()
    duplicate = await sql_client.post(
        "/api/vocabulary", json={"word": "HELLO", "meaning": "duplicate"}
    )
    assert duplicate.status_code == 409
    assert len((await sql_client.get("/api/vocabulary?due=true")).json()) == 1
    request = {"client_request_id": str(uuid4())}
    session = (await sql_client.post("/api/flashcards/sessions", json=request)).json()
    assert (
        await sql_client.post("/api/flashcards/sessions", json=request)
    ).json() == session
    url = f"/api/flashcards/sessions/{session['flashcard_session_id']}/reviews"
    review = {
        "client_request_id": str(uuid4()),
        "vocabulary_id": word["user_vocabulary_id"],
        "rating": "good",
    }
    first = await sql_client.post(url, json=review)
    assert first.status_code == 200, first.text
    assert first.json()["interval_days"] == 4
    assert (await sql_client.post(url, json=review)).json() == first.json()
    assert (
        await sql_client.post(url, json={**review, "rating": "easy"})
    ).status_code == 409
    assert (await sql_client.get("/api/vocabulary?due=true")).json() == []
    assert (
        await sql_client.post(url, json={**review, "client_request_id": str(uuid4())})
    ).status_code == 409
    close = f"/api/flashcards/sessions/{session['flashcard_session_id']}/close"
    closed = (await sql_client.post(close)).json()
    assert closed["duration_source"] == "measured"
    assert (await sql_client.post(close)).json() == closed
    totals = (await sql_client.get("/api/dashboard")).json()
    assert (
        totals["saved_word_count"]
        == totals["mastered_word_count"]
        == totals["review_count"]
        == 1
    )
    current = (await sql_client.get("/api/vocabulary")).json()[0]
    assert current["review_count"] == 1
    removed = await sql_client.request(
        "DELETE",
        f"/api/vocabulary/{word['user_vocabulary_id']}",
        json={"version": current["version"]},
    )
    assert removed.status_code == 204
    assert (await sql_client.get("/api/vocabulary")).json() == []
    assert (await sql_client.get("/api/dashboard")).json()["review_count"] == 1


async def test_chat_idempotency_ownership(sql_client: AsyncClient) -> None:
    """Chat retains context, saves exactly one assistant reply, and isolates owners."""
    first_user = await account(sql_client)
    request = {"client_request_id": str(uuid4()), "topic_code": "coffee", "level": "A2"}
    created = await sql_client.post("/api/conversations", json=request)
    assert created.status_code == 201, created.text
    conversation = created.json()
    assert (
        await sql_client.post("/api/conversations", json=request)
    ).json() == conversation
    identity = conversation["conversation_id"]
    url = f"/api/conversations/{identity}/messages"
    body = {"client_request_id": str(uuid4()), "message": "I would like a coffee."}
    result = await sql_client.post(url, json=body)
    assert result.status_code == 200, result.text
    assert result.json()["evaluation"]["is_mock"] is True
    assert (await sql_client.post(url, json=body)).json() == result.json()
    assert (
        await sql_client.post(url, json={**body, "message": "changed"})
    ).status_code == 409
    assert len((await sql_client.get(url)).json()) == 3
    await account(sql_client, "other")
    assert (await sql_client.get(url)).status_code == 404
    assert (
        await sql_client.post(url, json={**body, "client_request_id": str(uuid4())})
    ).status_code == 404
    sql_client.headers["Authorization"] = "Bearer " + first_user["access_token"]
    assert len((await sql_client.get("/api/conversations")).json()) == 1
    assert (await sql_client.post(f"/api/conversations/{identity}/close")).json()[
        "status"
    ] == "completed"
    assert (
        await sql_client.post(url, json={**body, "client_request_id": str(uuid4())})
    ).status_code == 409


async def test_practice_writing(sql_client: AsyncClient) -> None:
    """Writing submission persists once; mock feedback is never a fabricated score."""
    await account(sql_client)
    lesson = (await sql_client.get("/api/lessons?skill=writing")).json()[0]
    body = {
        "client_request_id": str(uuid4()),
        "lesson_id": lesson["lesson_id"],
        "mode": "writing",
    }
    response = await sql_client.post("/api/practice/attempts", json=body)
    assert response.status_code == 201, response.text
    attempt = response.json()
    assert (
        await sql_client.post("/api/practice/attempts", json=body)
    ).json() == attempt
    identity = attempt["attempt_id"]
    url = f"/api/practice/attempts/{identity}/submit"
    submission = {
        "version": attempt["version"],
        "submitted_text": "I enjoy learning English every day.",
    }
    result = await sql_client.post(url, json=submission)
    assert result.status_code == 200, result.text
    assert result.json()["score_percent"] is None
    assert result.json()["evaluations"][0]["is_mock"] is True
    assert (
        result.json()["evaluations"][0]["result_json"]["assessment_available"] is False
    )
    assert (await sql_client.post(url, json=submission)).json() == result.json()
    assert (
        await sql_client.post(url, json={**submission, "submitted_text": "changed"})
    ).status_code == 409
    assert (
        await sql_client.get(f"/api/practice/attempts/{identity}")
    ).json() == result.json()
    assert len((await sql_client.get("/api/practice/attempts")).json()) == 1


@pytest.mark.parametrize("mode", ["multiple_choice", "dictation"])
async def test_listening_grading(
    sql_client: AsyncClient, sql_database: Database, mode: str
) -> None:
    """Listening scores use the stored answer key and cannot be supplied by clients."""
    await account(sql_client)
    lesson = (await sql_client.get("/api/lessons?skill=listening")).json()[0]
    detail = (await sql_client.get(f"/api/lessons/{lesson['lesson_id']}")).json()
    question = next(row for row in detail["questions"] if row["question_type"] == mode)
    answer: dict[str, Any] = {"question_id": question["question_id"]}
    assert sql_database.external_connection is not None
    if mode == "multiple_choice":
        answer["selected_option_id"] = sql_database.external_connection.execute(
            text(
                "SELECT OptionId FROM em.QuestionOptions "
                "WHERE QuestionId=:id AND IsCorrect=1"
            ),
            {"id": question["question_id"]},
        ).scalar_one()
    else:
        expected = sql_database.external_connection.execute(
            text("SELECT ExpectedText FROM em.LessonQuestions WHERE QuestionId=:id"),
            {"id": question["question_id"]},
        ).scalar_one()
        answer["answer_text"] = "  " + expected.upper() + "  "
    attempt = (
        await sql_client.post(
            "/api/practice/attempts",
            json={
                "client_request_id": str(uuid4()),
                "lesson_id": lesson["lesson_id"],
                "mode": mode,
                "playback_rate": 0.75,
            },
        )
    ).json()
    url = f"/api/practice/attempts/{attempt['attempt_id']}/submit"
    submission = {"version": attempt["version"], "answers": [answer]}
    assert (
        await sql_client.post(url, json={**submission, "score_percent": 100})
    ).status_code == 422
    assert (
        await sql_client.post(url, json={"version": attempt["version"], "answers": []})
    ).status_code == 422
    result = await sql_client.post(url, json=submission)
    assert result.status_code == 200, result.text
    assert result.json()["score_percent"] == 100
    assert result.json()["answers"][0]["is_correct"] is True
    assert result.json()["evaluations"] == []
    assert result.json()["answer_key"][0]["question_id"] == question["question_id"]
    if mode == "dictation":
        assert result.json()["answer_key"][0]["expected_text"] is not None
    else:
        assert (
            result.json()["answer_key"][0]["correct_option_id"]
            == answer["selected_option_id"]
        )
    assert (await sql_client.post(url, json=submission)).json() == result.json()


async def test_private_media(sql_client: AsyncClient) -> None:
    """Avatars are sanitized, recordings are measured, and downloads check ownership."""
    first = await account(sql_client)
    image = io.BytesIO()
    Image.new("RGB", (32, 32), "red").save(image, "PNG")
    response = await sql_client.post(
        "/api/media?purpose=avatar",
        files={"file": ("avatar.png", image.getvalue(), "image/png")},
    )
    assert response.status_code == 201, response.text
    asset = response.json()
    assert "storage_key" not in asset
    assert asset["content_type"] == "image/jpeg"
    url = f"/api/media/{asset['media_asset_id']}"
    assert (await sql_client.get(url)).headers["content-type"] == "image/jpeg"
    profile = (await sql_client.get("/api/me/profile")).json()
    assert (
        await sql_client.put(
            "/api/me/profile",
            json={
                "version": profile["version"],
                "display_name": "Learner",
                "avatar_asset_id": asset["media_asset_id"],
            },
        )
    ).status_code == 200
    audio = io.BytesIO()
    with wave.open(audio, "wb") as recording:
        recording.setnchannels(1)
        recording.setsampwidth(2)
        recording.setframerate(8000)
        recording.writeframes(b"\x00\x00" * 8000)
    saved = await sql_client.post(
        "/api/media?purpose=recording",
        files={"file": ("recording.wav", audio.getvalue(), "audio/wav")},
    )
    assert saved.status_code == 201, saved.text
    assert saved.json()["duration_ms"] == 1000
    assert (
        await sql_client.post(
            "/api/media", files={"file": ("bad.svg", b"<svg></svg>", "image/svg+xml")}
        )
    ).status_code == 422
    await account(sql_client, "other")
    assert (await sql_client.get(url)).status_code == 404
    sql_client.headers["Authorization"] = "Bearer " + first["access_token"]
    assert (await sql_client.get(url)).status_code == 200


async def test_migration_repeat(sql_database: Database) -> None:
    """Reapplying version one changes neither catalogue identities nor row counts."""
    assert sql_database.external_connection is not None
    apply_scripts(sql_database.external_connection)
    assert (
        sql_database.external_connection.execute(
            text("SELECT COUNT(*) FROM em.Lessons")
        ).scalar_one()
        == 9
    )
    sql_database.external_connection.exec_driver_sql("SET XACT_ABORT OFF;")


def test_database_pool_runtime(sql_connection: Connection) -> None:
    """Check the production pool/transaction path against SQL Server without DDL."""
    assert CONNECTION is not None
    database = Database(
        Settings(
            database_odbc_connection=SecretStr(CONNECTION),
            jwt_secret=SecretStr("test-only-key-more-than-thirty-two-characters"),
        )
    )
    try:
        engine = database.get_engine()
        assert database.get_engine() is engine
        with database.transaction() as connection:
            assert connection.execute(text("SELECT DB_NAME()")).scalar_one() == "tempdb"
            assert connection.execute(text("SELECT 1")).scalar_one() == 1
            with pytest.raises(ValueError):
                database.models.table("untrusted-name", connection)
    finally:
        database.close()


def learner_id(database: Database) -> int:
    """Get the one isolated account's internal ID for service lifecycle assertions."""
    assert database.external_connection is not None
    result = database.external_connection.execute(
        text("SELECT UserId FROM em.Users WHERE Username='learner'")
    )
    return int(result.scalar_one())


async def test_account_edits_and_password_revocation(
    sql_client: AsyncClient, mailer: TestMailer
) -> None:
    """Identity edits require the password; old-address reset tokens become unusable."""
    data = await account(sql_client)
    await sql_client.post(
        "/api/auth/forgot-password", json={"email": "learner@example.test"}
    )
    token = mailer.messages[0][1]
    body = {
        "username": "renamed",
        "email": "new@example.test",
        "version": data["user"]["version"],
        "current_password": "wrong",
    }
    assert (await sql_client.put("/api/me/account", json=body)).status_code == 401
    body["current_password"] = PASSWORD
    updated = await sql_client.put("/api/me/account", json=body)
    assert updated.status_code == 200, updated.text
    assert updated.json()["username"] == "renamed"
    assert (await sql_client.put("/api/me/account", json=body)).status_code == 409
    assert (
        await sql_client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "replacement-password"},
        )
    ).status_code == 400
    changed = await sql_client.post(
        "/api/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "replacement-password"},
    )
    assert changed.status_code == 204
    assert (await sql_client.get("/api/me")).status_code == 401
    assert (
        await sql_client.post(
            "/api/auth/refresh", json={"refresh_token": data["refresh_token"]}
        )
    ).status_code == 401
    assert (
        await sql_client.post(
            "/api/auth/login",
            json={"identifier": "new@example.test", "password": "replacement-password"},
        )
    ).status_code == 200


async def test_expired_and_disabled_accounts(
    sql_client: AsyncClient, sql_database: Database
) -> None:
    """Valid JWTs cannot bypass expired database sessions or disabled account status."""
    data = await account(sql_client)
    assert sql_database.external_connection is not None
    sql_database.external_connection.execute(
        text(
            "UPDATE em.AuthSessions SET CreatedAt=DATEADD(day,-2,SYSUTCDATETIME()), "
            "ExpiresAt=DATEADD(day,-1,SYSUTCDATETIME())"
        )
    )
    assert (await sql_client.get("/api/me")).status_code == 401
    assert (
        await sql_client.post(
            "/api/auth/refresh", json={"refresh_token": data["refresh_token"]}
        )
    ).status_code == 401
    sql_database.external_connection.execute(
        text("UPDATE em.Users SET Status='disabled'")
    )
    assert (
        await sql_client.post(
            "/api/auth/login", json={"identifier": "learner", "password": PASSWORD}
        )
    ).status_code == 401
    assert (await sql_client.get("/api/me")).status_code == 401


async def test_cancel_pending_chat(
    sql_client: AsyncClient, sql_database: Database
) -> None:
    """Durable cancellation unblocks chat and discards any late provider result."""
    await account(sql_client)
    conversation = (
        await sql_client.post(
            "/api/conversations", json={"client_request_id": str(uuid4())}
        )
    ).json()
    identity = conversation["conversation_id"]
    service = ConversationService(sql_database)
    user_id = learner_id(sql_database)
    body = MessageCreate(client_request_id=uuid4(), message="Hello there")
    pending = service.prepare(user_id, identity, body)
    assert isinstance(pending, PendingTurn)
    url = f"/api/conversations/{identity}/messages"
    duplicate = await sql_client.post(url, json=body.model_dump(mode="json"))
    assert duplicate.json()["reply"]["status"] == "pending"
    assert (
        await sql_client.post(
            url, json={"client_request_id": str(uuid4()), "message": "Another"}
        )
    ).status_code == 409
    assert (
        await sql_client.post(f"/api/conversations/{identity}/close")
    ).status_code == 409
    evaluation_id = pending.evaluation["EvaluationId"]
    evaluation_url = f"/api/evaluations/{evaluation_id}"
    assert (await sql_client.get(evaluation_url)).json()["errors"] == []
    assert (await sql_client.post(evaluation_url + "/cancel")).json()[
        "status"
    ] == "cancelled"
    late = service.finalize(
        user_id, pending, "completed", "late reply must not be saved", 5
    )
    assert late["reply"]["status"] == "cancelled"
    assert late["reply"]["content"] == ""
    assert (await sql_client.post(evaluation_url + "/cancel")).json()[
        "status"
    ] == "cancelled"
    assert (
        await sql_client.post(
            url, json={"client_request_id": str(uuid4()), "message": "Try again"}
        )
    ).status_code == 200
    await account(sql_client, "other")
    assert (await sql_client.get(evaluation_url)).status_code == 404
    assert (await sql_client.post(evaluation_url + "/cancel")).status_code == 404


class FailingProvider(MockLLMClient):
    """Simulate upstream failure without external API requests."""

    async def generate(self, message: str, level: Level, system_prompt: str) -> str:
        """Throw an error that must never be exposed to API consumers."""
        raise TimeoutError("private-provider-error")


async def test_failed_ai_lifecycle(
    sql_client: AsyncClient, sql_database: Database
) -> None:
    """Provider failure remains inspectable, and retries do not duplicate saved work."""
    await account(sql_client)
    user_id = learner_id(sql_database)
    conversation = (
        await sql_client.post(
            "/api/conversations", json={"client_request_id": str(uuid4())}
        )
    ).json()
    service = ConversationService(sql_database)
    body = MessageCreate(client_request_id=uuid4(), message="Hello")
    with pytest.raises(HTTPException) as error:
        await service.send(
            user_id, conversation["conversation_id"], body, FailingProvider()
        )
    assert error.value.status_code == 502
    assert "private-provider-error" not in error.value.detail
    saved = await service.send(
        user_id, conversation["conversation_id"], body, MockLLMClient()
    )
    assert saved["evaluation"]["status"] == saved["reply"]["status"] == "failed"
    assert len(service.messages(user_id, conversation["conversation_id"], 0, 100)) == 3
    lesson = (await sql_client.get("/api/lessons?skill=writing")).json()[0]
    created = (
        await sql_client.post(
            "/api/practice/attempts",
            json={
                "client_request_id": str(uuid4()),
                "lesson_id": lesson["lesson_id"],
                "mode": "writing",
            },
        )
    ).json()
    from app.schemas.learning import AttemptSubmit

    submission = AttemptSubmit(
        version=created["version"], submitted_text="I like learning English."
    )
    practice = PracticeService(sql_database)
    with pytest.raises(HTTPException) as error:
        await practice.submit(
            user_id, created["attempt_id"], submission, FailingProvider()
        )
    assert error.value.status_code == 502
    assert (
        practice.detail(user_id, created["attempt_id"])["evaluations"][0]["status"]
        == "failed"
    )


async def test_vocabulary_edits_and_owner_checks(sql_client: AsyncClient) -> None:
    """Preserve scheduling and reject sources owned by another learner."""
    first = await account(sql_client)
    word = (
        await sql_client.post(
            "/api/vocabulary", json={"word": "hello", "meaning": "xin chào"}
        )
    ).json()
    identity = word["user_vocabulary_id"]
    body = {"version": word["version"], "word": "hello", "meaning": "updated"}
    response = await sql_client.put(f"/api/vocabulary/{identity}", json=body)
    assert response.status_code == 200
    assert response.json()["review_count"] == 0
    assert (
        await sql_client.put(f"/api/vocabulary/{identity}", json=body)
    ).status_code == 409
    await account(sql_client, "other")
    assert (
        await sql_client.put(f"/api/vocabulary/{identity}", json=body)
    ).status_code == 404
    assert (
        await sql_client.post(
            "/api/vocabulary",
            json={"word": "hello", "meaning": "other", "source_message_id": 999999},
        )
    ).status_code == 404
    sql_client.headers["Authorization"] = "Bearer " + first["access_token"]
    assert (
        await sql_client.post(
            "/api/vocabulary",
            json={
                "word": "two",
                "meaning": "two sources",
                "source_message_id": 1,
                "source_attempt_id": 1,
            },
        )
    ).status_code == 422


async def test_practice_speaking_and_abandon(sql_client: AsyncClient) -> None:
    """Keep speaking demos ungraded and abandoned practice uncredited."""
    await account(sql_client)
    lesson = (await sql_client.get("/api/lessons?skill=speaking")).json()[0]
    request = {
        "client_request_id": str(uuid4()),
        "lesson_id": lesson["lesson_id"],
        "mode": "shadowing",
    }
    assert (
        await sql_client.post(
            "/api/practice/attempts", json={**request, "mode": "writing"}
        )
    ).status_code == 422
    attempt = (await sql_client.post("/api/practice/attempts", json=request)).json()
    url = f"/api/practice/attempts/{attempt['attempt_id']}/submit"
    assert (
        await sql_client.post(url, json={"version": attempt["version"]})
    ).status_code == 422
    result = await sql_client.post(
        url,
        json={
            "version": attempt["version"],
            "submitted_text": "I would like a cup of coffee, please.",
        },
    )
    assert result.status_code == 200, result.text
    assert result.json()["score_percent"] is None
    another = (
        await sql_client.post(
            "/api/practice/attempts",
            json={**request, "client_request_id": str(uuid4())},
        )
    ).json()
    abandoned = await sql_client.post(
        f"/api/practice/attempts/{another['attempt_id']}/abandon"
    )
    assert abandoned.json()["status"] == "abandoned"
    assert abandoned.json()["duration_seconds"] == 0
    assert (
        await sql_client.post(
            f"/api/practice/attempts/{another['attempt_id']}/submit",
            json={"version": another["version"], "submitted_text": "Hello"},
        )
    ).status_code == 409


async def test_manual_mastery_and_search(sql_client: AsyncClient) -> None:
    """Mirror notebook filtering/toggles without awarding phantom reviews."""
    await account(sql_client)
    word = (
        await sql_client.post(
            "/api/vocabulary", json={"word": "100%", "meaning": "literal percentage"}
        )
    ).json()
    await sql_client.post(
        "/api/vocabulary", json={"word": "hello", "meaning": "xin chào"}
    )
    assert len((await sql_client.get("/api/vocabulary?search=%25")).json()) == 1
    assert (await sql_client.get("/api/vocabulary?mastered=true")).json() == []
    body = {"version": word["version"], "is_mastered": True}
    url = f"/api/vocabulary/{word['user_vocabulary_id']}/mastery"
    saved = await sql_client.put(url, json=body)
    assert saved.status_code == 200, saved.text
    assert saved.json()["review_count"] == 0
    assert saved.json()["next_review_at"] is None
    assert (await sql_client.put(url, json=body)).status_code == 409
    assert len((await sql_client.get("/api/vocabulary?mastered=true")).json()) == 1
    assert (await sql_client.get("/api/dashboard")).json()["review_count"] == 0


async def test_rollback_on_bad_submission(
    sql_client: AsyncClient, sql_database: Database
) -> None:
    """Roll back calculated answers and completion on a stale rowversion."""
    await account(sql_client)
    lesson = (await sql_client.get("/api/lessons?skill=listening")).json()[0]
    question = next(
        row
        for row in (await sql_client.get(f"/api/lessons/{lesson['lesson_id']}")).json()[
            "questions"
        ]
        if row["question_type"] == "dictation"
    )
    attempt = (
        await sql_client.post(
            "/api/practice/attempts",
            json={
                "client_request_id": str(uuid4()),
                "lesson_id": lesson["lesson_id"],
                "mode": "dictation",
            },
        )
    ).json()
    url = f"/api/practice/attempts/{attempt['attempt_id']}/submit"
    body = {
        "version": "0" * 16,
        "answers": [
            {"question_id": question["question_id"], "answer_text": "incorrect"}
        ],
    }
    assert (await sql_client.post(url, json=body)).status_code == 409
    assert (
        await sql_client.get(f"/api/practice/attempts/{attempt['attempt_id']}")
    ).json()["answers"] == []
    body["version"] = attempt["version"]
    result = await sql_client.post(url, json=body)
    assert result.status_code == 200, result.text
    assert result.json()["score_percent"] == 0
    assert sql_database.external_connection is not None
    assert (
        Repository(sql_database, sql_database.external_connection).one(
            "StudySessions", StudySessionId=attempt["study_session_id"]
        )["Status"]
        == "completed"
    )
