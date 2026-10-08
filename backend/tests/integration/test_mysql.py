"""MySQL API workflows on an explicitly selected test schema; all writes roll back."""

import os
from collections.abc import Iterator
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient
from pydantic import SecretStr
from sqlalchemy import Connection, create_engine, text
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.db.database import Database
from app.db.repository import Repository
from app.schemas.speech import TTSRequest
from app.services.speech import SpeechService

from .test_sqlserver import account
from .test_sqlserver import mailer as mailer
from .test_sqlserver import sql_client as sql_client
from .test_sqlserver import sql_database as sql_database
from .test_sqlserver import (
    test_account_edits_and_password_revocation as test_account_edits,  # noqa: F401
)
from .test_sqlserver import test_auth_sessions as test_auth_sessions
from .test_sqlserver import (
    test_chat_idempotency_ownership as test_chat_idempotency_ownership,
)
from .test_sqlserver import (
    test_manual_mastery_and_search as test_manual_mastery_and_search,
)
from .test_sqlserver import (
    test_practice_speaking_and_abandon as test_practice_speaking_and_abandon,
)
from .test_sqlserver import test_practice_writing as test_practice_writing
from .test_sqlserver import test_private_media as test_private_media
from .test_sqlserver import test_profile_preferences as test_profile_preferences
from .test_sqlserver import (
    test_reset_delivery_does_not_reveal_accounts as test_reset_delivery,  # noqa: F401
)
from .test_sqlserver import test_reset_password as test_reset_password
from .test_sqlserver import (
    test_rollback_on_bad_submission as test_rollback_on_bad_submission,
)
from .test_sqlserver import (
    test_vocabulary_cards_statistics as test_vocabulary_cards_statistics,
)
from .test_sqlserver import (
    test_vocabulary_edits_and_owner_checks as test_vocabulary_edits_and_owner_checks,
)

pytestmark = pytest.mark.anyio


@pytest.fixture(scope="module")
def sql_connection() -> Iterator[Connection]:
    """Require a pre-created _test database without changing application DDL."""
    configured = os.getenv("MYSQL_TEST_URL")
    if not configured:
        pytest.skip("Set MYSQL_TEST_URL to a separate pre-created MySQL _test schema.")
    url = make_url(configured)
    assert url.drivername == "mysql+pymysql"
    assert url.database and url.database.endswith(
        "_test"
    ), "Tests require a _test schema."
    engine = create_engine(
        url,
        hide_parameters=True,
        connect_args={"init_command": "SET time_zone = '+00:00'", "charset": "utf8mb4"},
    )
    try:
        with engine.connect() as connection:
            outer = connection.begin()
            try:
                assert (
                    connection.execute(
                        text("SELECT COUNT(*) FROM NguoiDung")
                    ).scalar_one()
                    == 0
                )
                yield connection
            finally:
                outer.rollback()
    finally:
        engine.dispose()


async def test_mysql_catalog(sql_client: AsyncClient) -> None:
    """Reflect every MySQL table/view and hide generated answer-key columns."""
    ready = await sql_client.get("/api/ready")
    assert ready.json() == {"status": "ok", "database": "mysql", "schema_version": 1}
    assert len((await sql_client.get("/api/lessons?limit=100")).json()) == 63
    lessons = (await sql_client.get("/api/lessons?skill=reading")).json()
    assert len(lessons) == 7
    lesson = (await sql_client.get(f"/api/lessons/{lessons[0]['lesson_id']}")).json()
    assert lesson["vocabulary"]
    assert all("expected_text" not in q for q in lesson["questions"])
    assert all(
        "correct_question_id" not in o and "is_correct" not in o
        for q in lesson["questions"]
        for o in q["options"]
    )


async def test_mysql_pool(sql_connection: Connection) -> None:
    """Exercise the actual engine path and session initialization outside savepoints."""
    configured = os.environ["MYSQL_TEST_URL"]
    database = Database(
        Settings(
            database_mysql_url=SecretStr(configured),
            jwt_secret=SecretStr("test-only-signing-secret-at-least-32-characters"),
        )
    )
    try:
        with database.transaction() as connection:
            assert (
                connection.execute(text("SELECT @@session.time_zone")).scalar_one()
                == "+00:00"
            )
            assert (
                connection.execute(text("SELECT @@transaction_isolation")).scalar_one()
                == "READ-COMMITTED"
            )
            assert len(database.models.table("Lessons", connection).columns) > 10
            database.lock_user(connection, -1)
            with pytest.raises(ValueError):
                database.models.table("UnknownTable", connection)
        assert database.get_engine() is database.get_engine()
    finally:
        database.close()


async def test_mysql_dictation_audio(sql_client: AsyncClient) -> None:
    """Deliver authenticated audio with saved preferences and mocked synthesis."""
    await account(sql_client)
    preferences = (await sql_client.get("/api/me/settings")).json()
    updated = await sql_client.put(
        "/api/me/settings",
        json={
            "version": preferences["version"],
            "theme": "light",
            "reduced_motion": False,
            "speech_rate": 1.25,
            "speech_voice_id": "US-Nam-1-TM",
        },
    )
    assert updated.status_code == 200, updated.text
    lesson = (await sql_client.get("/api/lessons?skill=listening")).json()[0]
    questions = (await sql_client.get(f"/api/lessons/{lesson['lesson_id']}")).json()[
        "questions"
    ]
    question = next(q for q in questions if q["question_type"] == "dictation")
    synthesis = AsyncMock(return_value=b"test-mp3")
    with patch.object(SpeechService, "synthesize", synthesis):
        response = await sql_client.get(
            f"/api/speech/dictation/{question['question_id']}/audio"
        )
        assert response.status_code == 200 and response.content == b"test-mp3"
        assert response.headers["content-type"] == "audio/mpeg"
        request = synthesis.call_args.args[0]
        assert isinstance(request, TTSRequest) and request.text
        assert request.speed == 1.25 and request.speaker_id == "US-Nam-1-TM"
        choice = next(q for q in questions if q["question_type"] == "multiple_choice")
        assert (
            await sql_client.get(f"/api/speech/dictation/{choice['question_id']}/audio")
        ).status_code == 404
    sql_client.headers.pop("Authorization")
    assert (
        await sql_client.get(f"/api/speech/dictation/{question['question_id']}/audio")
    ).status_code == 401


async def test_mysql_levels_voice_onboarding(sql_client: AsyncClient) -> None:
    """Save all seven levels, onboarding timestamp and a voice across fresh logins."""
    await account(sql_client)
    profile = (await sql_client.get("/api/me/profile")).json()
    for level in ("Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"):
        response = await sql_client.put(
            "/api/me/profile",
            json={
                "version": profile["version"],
                "display_name": "Người học",
                "cefr_level": level,
                "onboarding_completed": True,
            },
        )
        assert response.status_code == 200, response.text
        updated = response.json()
        assert updated["cefr_level"] == level and updated["onboarding_completed_at"]
        assert int(updated["version"], 16) == int(profile["version"], 16) + 1
        profile = updated
    settings = (await sql_client.get("/api/me/settings")).json()
    payload = {
        "version": settings["version"],
        "theme": "dark",
        "reduced_motion": True,
        "speech_rate": 1.25,
        "speech_voice_id": "US-Nam-1-TM",
    }
    response = await sql_client.put("/api/me/settings", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["speech_voice_id"] == payload["speech_voice_id"]
    assert (await sql_client.put("/api/me/settings", json=payload)).status_code == 409
    assert (
        await sql_client.put(
            "/api/me/settings", json={**payload, "speech_voice_id": "bad voice"}
        )
    ).status_code == 422
    await sql_client.post("/api/auth/logout")
    sql_client.headers.pop("Authorization")
    login = await sql_client.post(
        "/api/auth/login",
        json={"identifier": "learner", "password": "test-password-123"},
    )
    sql_client.headers["Authorization"] = "Bearer " + login.json()["access_token"]
    assert (await sql_client.get("/api/me/profile")).json() == profile
    assert (await sql_client.get("/api/me/settings")).json()[
        "speech_voice_id"
    ] == payload["speech_voice_id"]


@pytest.mark.parametrize(
    "skill,mode",
    [
        ("reading", "multiple_choice"),
        ("listening", "multiple_choice"),
        ("listening", "dictation"),
    ],
)
async def test_mysql_grading(
    sql_client: AsyncClient, sql_database: object, skill: str, mode: str
) -> None:
    """Grade stored revisions on the server and preserve replay idempotency."""
    from app.db.database import Database

    assert isinstance(sql_database, Database)
    await account(sql_client)
    lesson = (await sql_client.get(f"/api/lessons?skill={skill}")).json()[0]
    questions = (await sql_client.get(f"/api/lessons/{lesson['lesson_id']}")).json()[
        "questions"
    ]
    assert sql_database.external_connection is not None
    repo = Repository(sql_database, sql_database.external_connection)
    answers = []
    for question in questions:
        if question["question_type"] != mode:
            continue
        if mode == "dictation":
            correct = repo.one("LessonQuestions", QuestionId=question["question_id"])[
                "ExpectedText"
            ]
            answers.append(
                {"question_id": question["question_id"], "answer_text": correct}
            )
        else:
            correct = repo.one(
                "QuestionOptions", QuestionId=question["question_id"], IsCorrect=True
            )["OptionId"]
            answers.append(
                {"question_id": question["question_id"], "selected_option_id": correct}
            )
    attempt = (
        await sql_client.post(
            "/api/practice/attempts",
            json={
                "client_request_id": str(uuid4()),
                "lesson_id": lesson["lesson_id"],
                "mode": mode,
            },
        )
    ).json()
    payload = {"version": attempt["version"], "answers": answers}
    route = f"/api/practice/attempts/{attempt['attempt_id']}/submit"
    result = await sql_client.post(route, json=payload)
    assert result.status_code == 200, result.text
    assert result.json()["score_percent"] == 100 and result.json()["answer_key"]
    assert (await sql_client.post(route, json=payload)).json() == result.json()
