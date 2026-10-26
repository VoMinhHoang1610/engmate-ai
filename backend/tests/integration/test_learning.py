"""Durable voice-led learning workflows on the isolated rollback-only database."""

import json
from datetime import timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.database import Database, Record
from app.db.learning import progress
from app.db.repository import Repository
from app.schemas.chat import MessageCreate
from app.services.common import now
from app.services.conversations import ConversationService, PendingTurn
from app.services.curriculum import all_lessons, course, find_lesson
from tests.integration.test_chat_database import chat_client, database, register

pytestmark = pytest.mark.anyio
__all__ = ["chat_client", "database"]


def first_lesson() -> str:
    """Use canonical authored material rather than a duplicated test curriculum."""
    return all_lessons()[0][1].id


async def start_lesson(client: AsyncClient, lesson_id: str | None = None) -> Record:
    """Open one lesson without triggering a provider request."""
    response = await client.post(
        f"/api/learning/lessons/{lesson_id or first_lesson()}/start",
        json={"client_request_id": str(uuid4())},
    )
    assert response.status_code == 200, response.text
    return dict(response.json())


def correct_answers(lesson_id: str) -> list[dict[str, object]]:
    """Read answer keys only from the server source in a test fixture."""
    return [
        {"question_id": item.id, "choice": item.answer}
        for item in find_lesson(lesson_id)[1].checks
    ]


async def send_turn(client: AsyncClient, identity: int, text: str) -> None:
    """Complete an actual mocked-provider turn through the normal chat endpoint."""
    response = await client.post(
        f"/api/conversations/{identity}/messages",
        json={"client_request_id": str(uuid4()), "message": text},
    )
    assert response.status_code == 200, response.text


async def test_learning_catalog_and_plan(chat_client: AsyncClient) -> None:
    """Authenticate catalog reads, hide keys and keep versioned plans account-owned."""
    assert (await chat_client.get("/api/learning/catalog")).status_code == 401
    await register(chat_client)
    response = await chat_client.get("/api/learning/catalog")
    assert response.status_code == 200
    lesson = response.json()["stages"][0]["modules"][0]["lessons"][0]
    assert len(lesson["checks"]) >= 2
    assert all(
        "answer" not in item and "explanation" not in item for item in lesson["checks"]
    )
    before = (await chat_client.get("/api/learning/plan")).json()
    assert before["version"] == 0 and before["goal_score"] == 650
    data = {
        **before,
        "goal_score": 800,
        "start_stage": course().stages[2].id,
        "minutes": 30,
        "exam_date": "2027-01-15",
    }
    saved = await chat_client.put("/api/learning/plan", json=data)
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    assert (await chat_client.get("/api/learning/plan")).json() == saved.json()
    assert (await chat_client.put("/api/learning/plan", json=data)).status_code == 409
    assert (
        await chat_client.put(
            "/api/learning/plan", json={**saved.json(), "start_stage": "missing"}
        )
    ).status_code == 422
    assert (
        await chat_client.put(
            "/api/learning/plan", json={**saved.json(), "goal_score": 450}
        )
    ).status_code == 422
    assert (
        await chat_client.put(
            "/api/learning/plan", json={**saved.json(), "minutes": 61}
        )
    ).status_code == 422
    assert (
        await chat_client.put(
            "/api/learning/plan", json={**saved.json(), "user_id": 12}
        )
    ).status_code == 422
    recommended = (await chat_client.get("/api/learning/progress")).json()
    expected = course().stages[2].modules[0].lessons[0].id
    assert recommended["recommended_lesson_id"] == expected
    await register(chat_client, "other")
    assert (await chat_client.get("/api/learning/plan")).json()["version"] == 0
    assert (await chat_client.get("/api/learning/progress")).json()["lessons"] == []


async def test_learning_start_resume_retry_and_phase(chat_client: AsyncClient) -> None:
    """Reuse the active chat, reject forged binding/step skips and stable-key misuse."""
    await register(chat_client)
    lesson_id = first_lesson()
    path = f"/api/learning/lessons/{lesson_id}"
    request = {"client_request_id": str(uuid4())}
    started = await chat_client.post(path + "/start", json=request)
    assert started.status_code == 200
    assert (
        await chat_client.post(path + "/start", json=request)
    ).json() == started.json()
    identity = started.json()["conversation"]["conversation_id"]
    resumed = await start_lesson(chat_client)
    assert resumed["conversation"]["conversation_id"] == identity
    assert resumed["progress"]["practice_turns"] == 0
    phase = {"conversation_id": identity, "phase": 2}
    assert (await chat_client.put(path + "/phase", json=phase)).status_code == 409
    phase["phase"] = 1
    assert (await chat_client.put(path + "/phase", json=phase)).json()["phase"] == 1
    phase["phase"] = 0
    assert (await chat_client.put(path + "/phase", json=phase)).json()["phase"] == 0
    other_id = all_lessons()[1][1].id
    assert (
        await chat_client.post(f"/api/learning/lessons/{other_id}/start", json=request)
    ).status_code == 409
    assert (
        await chat_client.post(
            "/api/learning/lessons/missing/start",
            json={"client_request_id": str(uuid4())},
        )
    ).status_code == 404
    await register(chat_client, "other")
    assert (await chat_client.put(path + "/phase", json=phase)).status_code == 404


async def test_learning_check_requires_real_practice(
    chat_client: AsyncClient, database: Database
) -> None:
    """Require real practice and keep check retries stable."""
    await register(chat_client)
    started = await start_lesson(chat_client)
    lesson_id = first_lesson()
    identity = started["conversation"]["conversation_id"]
    path = f"/api/learning/lessons/{lesson_id}/check"
    answers = correct_answers(lesson_id)
    data = {"client_request_id": str(uuid4()), "answers": answers}
    early = await chat_client.post(path, json=data)
    assert early.status_code == 200
    assert early.json()["correct"] == len(answers)
    assert early.json()["passed"] is False
    assert early.json()["progress"]["completed"] is False
    assert early.json()["progress"]["review_due"] is not None
    assert (await chat_client.post(path, json=data)).json() == early.json()
    assert (
        await chat_client.post(
            path, json={"client_request_id": str(uuid4()), "answers": answers[:1]}
        )
    ).status_code == 422
    assert (
        await chat_client.post(
            path, json={"client_request_id": str(uuid4()), "answers": [answers[0]] * 2}
        )
    ).status_code == 422
    malformed = [{"question_id": "foreign-question", "choice": 0}, *answers[1:]]
    assert (
        await chat_client.post(
            path, json={"client_request_id": str(uuid4()), "answers": malformed}
        )
    ).status_code == 422
    with database.transaction() as connection:
        user = Repository(database, connection).one("Users", Username="learner")
    service = ConversationService(database)
    failed_turn = service.prepare(
        user["UserId"],
        identity,
        MessageCreate(client_request_id=uuid4(), message="This request will fail."),
    )
    assert isinstance(failed_turn, PendingTurn)
    pending = (await chat_client.get("/api/learning/progress")).json()
    assert pending["lessons"][0]["practice_turns"] == 0
    service.finalize(user["UserId"], failed_turn, "failed", None, 10)
    failed = (await chat_client.get("/api/learning/progress")).json()
    assert failed["lessons"][0]["practice_turns"] == 0
    for text in [
        "My name is Mai.",
        "I work in an office.",
        "I study English every day.",
    ]:
        await send_turn(chat_client, identity, text)
    data["client_request_id"] = str(uuid4())
    passed = await chat_client.post(path, json=data)
    assert passed.status_code == 200
    result = passed.json()
    assert result["passed"] is True
    assert result["progress"]["completed"] is True
    assert result["progress"]["practice_turns"] == 3
    assert len(result["feedback"]) == len(answers)
    assert (await chat_client.post(path, json=data)).json() == result
    different = [dict(item) for item in answers]
    different[0]["choice"] = (find_lesson(lesson_id)[1].checks[0].answer + 1) % 2
    assert (
        await chat_client.post(path, json={**data, "answers": different})
    ).status_code == 409
    summary = (await chat_client.get("/api/learning/progress")).json()
    assert summary["recommended_lesson_id"] == all_lessons()[1][1].id
    with database.transaction() as connection:
        connection.execute(
            progress.update().values(ReviewDue=now() - timedelta(days=1))
        )
    summary = (await chat_client.get("/api/learning/progress")).json()
    assert lesson_id in summary["review_lesson_ids"]


async def test_learning_context_and_spoken_navigation(
    chat_client: AsyncClient, database: Database
) -> None:
    """Send canonical context to Gemini without crediting spoken navigation."""
    await register(chat_client)
    started = await start_lesson(chat_client)
    identity = started["conversation"]["conversation_id"]
    for text in ["Mate, bước tiếp theo!", "Mate next step", "Mate previous step"]:
        await send_turn(chat_client, identity, text)
    summary = (await chat_client.get("/api/learning/progress")).json()
    assert summary["lessons"][0]["phase"] == 1
    assert summary["lessons"][0]["practice_turns"] == 0
    with database.transaction() as connection:
        repo = Repository(database, connection)
        user = repo.one("Users", Username="learner")
        stored = repo.one("Conversations", ConversationId=identity)
        assert stored["PromptVersion"] == "toeic.v1"
        assert connection.scalar(select(progress.c.ConversationId)) == identity
    turn = ConversationService(database).prepare(
        user["UserId"],
        identity,
        MessageCreate(client_request_id=uuid4(), message="I understand the example."),
    )
    assert isinstance(turn, PendingTurn)
    lesson = find_lesson(first_lesson())[1]
    context = json.loads(turn.prompt.rsplit("\n", 1)[-1])
    assert context["lesson"]["opening"] == lesson.opening
    assert context["lesson"]["objective"] == lesson.objective
    assert "checks" not in context["lesson"]


async def test_learning_invalid_check_and_owner(chat_client: AsyncClient) -> None:
    """Reject absent lesson sessions, invalid choices and another account's evidence."""
    await register(chat_client)
    lesson_id = first_lesson()
    path = f"/api/learning/lessons/{lesson_id}/check"
    answers = correct_answers(lesson_id)
    data = {"client_request_id": str(uuid4()), "answers": answers}
    assert (await chat_client.post(path, json=data)).status_code == 409
    await start_lesson(chat_client)
    invalid = [dict(item) for item in answers]
    invalid[0]["choice"] = 7
    assert (
        await chat_client.post(path, json={**data, "answers": invalid})
    ).status_code == 422
    await register(chat_client, "other")
    assert (await chat_client.post(path, json=data)).status_code == 409


async def test_recommendation_stops_at_selected_goal(
    chat_client: AsyncClient, database: Database
) -> None:
    """Stop at the selected goal while higher-stage lessons stay browsable."""
    await register(chat_client)
    stage = course().stages[1]
    response = await chat_client.put(
        "/api/learning/plan",
        json={
            "version": 0,
            "goal_score": 450,
            "start_stage": stage.id,
            "minutes": 15,
            "exam_date": None,
        },
    )
    assert response.status_code == 200
    with database.transaction() as connection:
        user = Repository(database, connection).one("Users", Username="learner")
        for module in stage.modules:
            for lesson in module.lessons:
                connection.execute(
                    progress.insert().values(
                        UserId=user["UserId"],
                        LessonId=lesson.id,
                        ConversationId=None,
                        Phase=4,
                        Completed=True,
                        CheckCorrect=2,
                        CheckTotal=2,
                        ReviewDue=None,
                    )
                )
    response = await chat_client.get("/api/learning/progress")
    assert response.json()["recommended_lesson_id"] is None
    higher = course().stages[4].modules[0].lessons[0].id
    assert (await start_lesson(chat_client, higher))["progress"]["lesson_id"] == higher
