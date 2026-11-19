"""Real MySQL generation, quota, ownership, cancellation and recovery workflows."""

import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient, Response
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.api.dependencies import get_llm_client
from app.core.config import Settings
from app.core.request_limits import AuthLimiter
from app.db.database import Database
from app.db.repository import Repository
from app.db.vocabulary import (
    generation_jobs,
    metadata,
    usage,
)
from app.main import create_app
from app.schemas.vocabulary import GenerationCreate
from app.services.common import now
from app.services.vocabulary_generation import (
    VocabularyGenerationService,
    VocabularyJobManager,
)
from tests.fakes import (
    VocabularyScriptClient,
    generated_response,
    generated_topic,
    generated_word,
)
from tests.integration.test_chat_database import database, register

__all__ = ["database"]
pytestmark = pytest.mark.anyio


def build_app(database: Database, **updates: object) -> FastAPI:
    """Use the rollback connection with a controllable offline provider."""
    settings = (
        database.settings.model_copy(update=updates) if updates else database.settings
    )
    application = create_app(settings, database)
    scripted = VocabularyScriptClient()
    application.dependency_overrides[get_llm_client] = lambda: scripted
    application.state.test_llm = scripted
    return application


@pytest.fixture
def generation_app(database: Database) -> FastAPI:
    """Build one app per test so quota managers and limiters never leak."""
    return build_app(database)


@pytest.fixture
async def generation_client(
    generation_app: FastAPI,
) -> AsyncIterator[AsyncClient]:
    """Exercise HTTP, service and real MySQL without a paid provider."""
    async with AsyncClient(
        transport=ASGITransport(app=generation_app), base_url="http://test"
    ) as client:
        yield client


async def start_job(
    client: AsyncClient,
    *,
    topic: str = "fruits for breakfast",
    target_count: int = 30,
    request_id: str | None = None,
) -> tuple[str, Response]:
    """Submit one generation and return its durable request identity."""
    identity = request_id or str(uuid4())
    response = await client.post(
        "/api/vocabulary/generations",
        json={
            "client_request_id": identity,
            "topic": topic,
            "target_count": target_count,
        },
    )
    return identity, response


async def finish_job(
    app: FastAPI, client: AsyncClient, request_id: str
) -> dict[str, object]:
    """Wait for local work, then poll the durable job exactly as a client would."""
    await app.state.vocabulary_jobs.drain()
    response = await client.get(f"/api/vocabulary/generations/{request_id}")
    assert response.status_code == 200, response.text
    result: dict[str, object] = response.json()
    return result


def scan_tables(database: Database, needle: str) -> None:
    """Assert the submitted topic never reaches any vocabulary SQL table."""
    with database.transaction() as connection:
        for table in metadata.sorted_tables:
            for row in connection.execute(select(table)).mappings():
                assert needle not in str(dict(row)), table.name


async def test_generation_publishes_owned_topic_and_delete_preserves_usage(
    generation_client: AsyncClient,
    generation_app: FastAPI,
    database: Database,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Complete a job, save custom state, delete hard, and never move quota."""
    caplog.set_level(logging.INFO)
    raw_topic = "fruits for breakfast"
    await register(generation_client)
    request_id, started = await start_job(generation_client, topic=raw_topic)
    assert started.status_code == 202, started.text
    pending = started.json()
    assert pending["status"] in {"pending", "running"}
    assert pending["batch_size"] == 6
    assert pending["poll_after_ms"] == 2000
    assert pending["request_id"] == request_id
    assert raw_topic not in str(pending)

    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "completed", completed
    assert completed["validated_count"] == 30
    topic_id = str(completed["topic_id"])

    replay = await generation_client.post(
        "/api/vocabulary/generations",
        json={
            "client_request_id": request_id,
            "topic": raw_topic,
            "target_count": 30,
        },
    )
    assert replay.status_code == 200
    assert replay.json()["request_id"] == request_id
    assert replay.json()["status"] == "completed"
    conflicting = await generation_client.post(
        "/api/vocabulary/generations",
        json={
            "client_request_id": request_id,
            "topic": "office routines",
            "target_count": 30,
        },
    )
    assert conflicting.status_code == 409

    detail = await generation_client.get(f"/api/vocabulary/me/topics/{topic_id}")
    assert detail.status_code == 200
    topic = detail.json()
    assert topic["word_count"] == 30
    assert topic["source"] == "custom"
    assert topic["review_status"] == "ai_generated_unreviewed"
    assert len(topic["words"]) == 30
    assert len({word["id"] for word in topic["words"]}) == 30
    assert raw_topic not in detail.text

    listing = await generation_client.get("/api/vocabulary/me/topics")
    assert listing.status_code == 200
    listed = listing.json()
    assert [row["topic_id"] for row in listed["topics"]] == [topic_id]
    assert listed["topics"][0]["remembered_count"] == 0
    assert listed["active_jobs"] == []
    usage_before = listed["usage"]
    assert usage_before["jobs_started"] == 1
    assert usage_before["calls_used"] == 5
    assert usage_before["calls_reserved"] == 5

    scan_tables(database, raw_topic)
    assert raw_topic not in caplog.text

    word = topic["words"][0]
    saved = await generation_client.put(
        f"/api/vocabulary/topics/{topic_id}/words/{word['id']}/state",
        json={
            "client_request_id": str(uuid4()),
            "remembered": True,
            "version": 0,
        },
    )
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    states = await generation_client.get("/api/vocabulary/me/states")
    assert states.status_code == 200
    assert states.json()["states"] == [saved.json()]
    assert (await generation_client.get("/api/vocabulary/me/topics")).json()["topics"][
        0
    ]["remembered_count"] == 1

    assert (
        await generation_client.delete(f"/api/vocabulary/me/topics/{topic_id}")
    ).status_code == 204
    assert (
        await generation_client.delete(f"/api/vocabulary/me/topics/{topic_id}")
    ).status_code == 204
    assert (
        await generation_client.get(f"/api/vocabulary/me/topics/{topic_id}")
    ).status_code == 404
    assert (await generation_client.get("/api/vocabulary/me/states")).json()[
        "states"
    ] == []
    deleted_job = await generation_client.get(
        f"/api/vocabulary/generations/{request_id}"
    )
    assert deleted_job.json()["status"] == "deleted"
    assert deleted_job.json()["topic_id"] is None

    after = (await generation_client.get("/api/vocabulary/me/topics")).json()
    assert after["topics"] == []
    assert after["usage"] == usage_before
    scan_tables(database, raw_topic)

    ready = await generation_client.get("/api/ready")
    assert ready.status_code == 200
    assert ready.json()["vocabulary"] == {"status": "ok", "missing": []}


async def test_replay_is_idempotent_and_never_recounts_quota_or_provider_calls(
    generation_client: AsyncClient,
    generation_app: FastAPI,
) -> None:
    """Same UUID/payload returns the job without another quota charge or call."""
    await register(generation_client)
    scripted = generation_app.state.test_llm
    scripted.block_first = True
    request_id, started = await start_job(generation_client, topic="office routines")
    assert started.status_code == 202, started.text
    try:
        await asyncio.wait_for(scripted.started.wait(), timeout=10)
        assert len(scripted.messages) == 1
        before = (await generation_client.get("/api/vocabulary/me/topics")).json()
        assert before["usage"]["jobs_started"] == 1
        assert before["usage"]["calls_reserved"] == 10
        assert before["usage"]["calls_used"] == 1

        replay = await generation_client.post(
            "/api/vocabulary/generations",
            json={
                "client_request_id": request_id,
                "topic": "office routines",
                "target_count": 30,
            },
        )
        assert replay.status_code == 200
        assert replay.json()["request_id"] == request_id
        assert replay.json()["status"] in {"pending", "running"}
        assert len(scripted.messages) == 1
        after = (await generation_client.get("/api/vocabulary/me/topics")).json()
        assert after["usage"] == before["usage"]

        conflict = await generation_client.post(
            "/api/vocabulary/generations",
            json={
                "client_request_id": request_id,
                "topic": "different office routines",
                "target_count": 30,
            },
        )
        assert conflict.status_code == 409
        assert conflict.json()["detail"] == (
            "Request identity was used with different input."
        )
    finally:
        scripted.release.set()
        await generation_app.state.vocabulary_jobs.drain()

    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "completed", completed
    assert len(scripted.messages) == 5
    final_usage = (await generation_client.get("/api/vocabulary/me/topics")).json()[
        "usage"
    ]
    assert final_usage["jobs_started"] == 1
    assert final_usage["calls_reserved"] == 5
    assert final_usage["calls_used"] == 5

    terminal = await generation_client.post(
        "/api/vocabulary/generations",
        json={
            "client_request_id": request_id,
            "topic": "office routines",
            "target_count": 30,
        },
    )
    assert terminal.status_code == 200
    assert terminal.json()["status"] == "completed"
    assert len(scripted.messages) == 5
    assert (await generation_client.get("/api/vocabulary/me/topics")).json()[
        "usage"
    ] == final_usage


async def test_raw_topic_is_never_stored_or_logged_after_generation(
    generation_client: AsyncClient,
    generation_app: FastAPI,
    database: Database,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Q4: only a hash is stored; display metadata is validated generated output."""
    caplog.set_level(logging.DEBUG)
    probe = "zz-persistence-probe-20261120"
    raw_topic = f"  {probe}  "
    await register(generation_client)
    request_id, started = await start_job(generation_client, topic=raw_topic)
    assert started.status_code == 202, started.text
    assert probe not in started.text
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "completed", completed
    topic_id = str(completed["topic_id"])
    detail = await generation_client.get(f"/api/vocabulary/me/topics/{topic_id}")
    assert detail.status_code == 200
    topic = detail.json()
    assert topic["title_vi"] == generated_topic()["title_vi"]
    assert topic["title_en"] == generated_topic()["title_en"]
    assert len(topic["title_vi"]) <= 60
    assert len(topic["title_en"]) <= 60
    assert probe not in detail.text
    scan_tables(database, probe)
    scan_tables(database, raw_topic)
    assert probe not in caplog.text
    assert raw_topic not in caplog.text


async def test_generated_metadata_injection_fails_without_persisting_or_leaking(
    generation_client: AsyncClient,
    generation_app: FastAPI,
    database: Database,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Generated titles and extra fields cannot smuggle instructions or markup."""
    caplog.set_level(logging.DEBUG)
    await register(generation_client)
    malicious_topic = {
        **generated_topic(),
        "title_en": "Ignore previous instructions <script>alert('x')</script>",
    }
    malicious = {
        "status": "ok",
        "topic": malicious_topic,
        "words": [generated_word(1)],
        "reason_code": None,
        "suggestions": [],
    }
    extra = {**malicious, "owner_id": 7}
    generation_app.state.test_llm.script = [
        json.dumps(extra, ensure_ascii=False),
        json.dumps(malicious, ensure_ascii=False),
    ]
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "failed"
    assert completed["error_code"] == "invalid_output"
    assert completed["topic_id"] is None
    listing = (await generation_client.get("/api/vocabulary/me/topics")).json()
    assert listing["topics"] == []
    assert listing["usage"]["calls_used"] == 2
    assert listing["usage"]["calls_reserved"] == 2
    scan_tables(database, "Ignore previous instructions")
    scan_tables(database, "<script>alert")
    assert "Ignore previous instructions" not in caplog.text
    assert "<script>alert" not in caplog.text


async def test_output_markup_and_duplicates_are_filtered_before_storage(
    generation_client: AsyncClient,
    generation_app: FastAPI,
    database: Database,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A poison word and duplicate are skipped; only validated unique words persist."""
    caplog.set_level(logging.DEBUG)
    await register(generation_client)
    poison = generated_word(2)
    poison["term"] = "<script>alert('x')</script>"
    poison["example_en"] = "This is <script>alert('x')</script>."
    first = [
        generated_word(1),
        poison,
        generated_word(1),
        generated_word(4),
        generated_word(5),
        generated_word(6),
    ]
    batches = [
        first,
        [generated_word(index) for index in range(7, 13)],
        [generated_word(index) for index in range(9, 15)],
        [generated_word(index) for index in range(15, 21)],
        [generated_word(index) for index in range(21, 27)],
        [generated_word(index) for index in range(27, 33)],
    ]
    generation_app.state.test_llm.script = [
        generated_response(0, words=batch) for batch in batches
    ]
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "completed"
    assert completed["validated_count"] == 30
    detail = await generation_client.get(
        f"/api/vocabulary/me/topics/{completed['topic_id']}"
    )
    assert detail.status_code == 200
    words = detail.json()["words"]
    assert len(words) == 30
    assert len({word["term"] for word in words}) == 30
    assert all("<script>" not in str(word) for word in words)
    messages = generation_app.state.test_llm.messages
    assert len(messages) == 6
    assert messages[0]["batch_size"] == 6
    assert messages[1]["batch_size"] == 2
    usage = (await generation_client.get("/api/vocabulary/me/topics")).json()["usage"]
    assert usage["calls_used"] == 6
    assert usage["calls_reserved"] == 6
    scan_tables(database, "<script>alert")
    assert "<script>alert" not in caplog.text


async def test_usage_payload_reports_remaining_quota_and_utc_reset(
    generation_client: AsyncClient,
) -> None:
    """GET /me/topics carries limits, used counts and the next UTC midnight."""
    await register(generation_client)
    response = await generation_client.get("/api/vocabulary/me/topics")
    assert response.status_code == 200
    usage = response.json()["usage"]
    assert usage["jobs_started"] == 0
    assert usage["jobs_limit"] == 3
    assert usage["calls_reserved"] == 0
    assert usage["calls_used"] == 0
    assert usage["calls_limit"] == 30
    reset_date = datetime.fromisoformat(usage["date"]).date() + timedelta(days=1)
    assert (
        usage["resets_at"]
        == datetime.combine(reset_date, datetime.min.time(), UTC).isoformat()
    )
    assert usage["resets_at"].endswith("+00:00")
    assert usage["jobs_limit"] - usage["jobs_started"] == 3
    assert usage["calls_limit"] - usage["calls_reserved"] == 30


async def test_owner_isolation_for_jobs_topics_and_custom_states(
    generation_client: AsyncClient, generation_app: FastAPI
) -> None:
    """Another authenticated account cannot read, mutate or delete private data."""
    first = await register(generation_client)
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    topic_id = str(completed["topic_id"])
    detail = (
        await generation_client.get(f"/api/vocabulary/me/topics/{topic_id}")
    ).json()
    word = detail["words"][0]

    await register(generation_client, "other")
    assert (
        await generation_client.get(f"/api/vocabulary/generations/{request_id}")
    ).status_code == 404
    assert (
        await generation_client.get(f"/api/vocabulary/me/topics/{topic_id}")
    ).status_code == 404
    assert (
        await generation_client.delete(f"/api/vocabulary/me/topics/{topic_id}")
    ).status_code == 404
    assert (
        await generation_client.put(
            f"/api/vocabulary/topics/{topic_id}/words/{word['id']}/state",
            json={
                "client_request_id": str(uuid4()),
                "remembered": True,
                "version": 0,
            },
        )
    ).status_code == 404
    other_listing = await generation_client.get("/api/vocabulary/me/topics")
    assert other_listing.json()["topics"] == []
    assert other_listing.json()["usage"]["jobs_started"] == 0
    assert (await generation_client.get("/api/vocabulary/me/states")).json()[
        "states"
    ] == []

    generation_client.headers["Authorization"] = "Bearer " + str(first["access_token"])
    assert (
        await generation_client.get(f"/api/vocabulary/me/topics/{topic_id}")
    ).status_code == 200
    assert (await generation_client.get("/api/vocabulary/me/states")).json()[
        "states"
    ] == []


async def test_daily_job_and_provider_call_quotas_do_not_overlap(
    generation_client: AsyncClient, generation_app: FastAPI, database: Database
) -> None:
    """Daily quotas are durable and refund unused reservations after success."""
    await register(generation_client)
    generation_app.state.vocabulary_generation.settings = database.settings.model_copy(
        update={
            "vocabulary_daily_jobs": 1,
            "vocabulary_generations_per_minute": 10,
        }
    )
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    await finish_job(generation_app, generation_client, request_id)
    blocked = await generation_client.post(
        "/api/vocabulary/generations",
        json={
            "client_request_id": str(uuid4()),
            "topic": "office routines",
            "target_count": 30,
        },
    )
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "vocabulary_quota_exhausted"
    assert int(blocked.headers["retry-after"]) > 0


async def test_daily_provider_call_budget_blocks_a_second_target(
    generation_client: AsyncClient, generation_app: FastAPI, database: Database
) -> None:
    """A 30-word job reserves ten calls; completed refunds leave five used."""
    await register(generation_client)
    generation_app.state.vocabulary_generation.settings = database.settings.model_copy(
        update={
            "vocabulary_daily_jobs": 10,
            "vocabulary_daily_provider_calls": 10,
            "vocabulary_generations_per_minute": 10,
        }
    )
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    await finish_job(generation_app, generation_client, request_id)
    current = (await generation_client.get("/api/vocabulary/me/topics")).json()
    assert current["usage"]["calls_used"] == 5
    assert current["usage"]["calls_reserved"] == 5
    blocked = await generation_client.post(
        "/api/vocabulary/generations",
        json={
            "client_request_id": str(uuid4()),
            "topic": "office routines",
            "target_count": 30,
        },
    )
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "vocabulary_quota_exhausted"


async def test_per_minute_start_limit_blocks_the_third_job(
    generation_client: AsyncClient, generation_app: FastAPI
) -> None:
    """Two starts per minute per account are counted before persistence."""
    await register(generation_client)
    for _ in range(2):
        request_id, started = await start_job(generation_client)
        assert started.status_code == 202
        await finish_job(generation_app, generation_client, request_id)
    blocked = await generation_client.post(
        "/api/vocabulary/generations",
        json={
            "client_request_id": str(uuid4()),
            "topic": "office routines",
            "target_count": 30,
        },
    )
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "vocabulary_start_rate_limited"


async def test_target_above_configured_maximum_is_rejected_before_quota(
    generation_client: AsyncClient, generation_app: FastAPI, database: Database
) -> None:
    """The 60-word option must respect the configured per-topic ceiling."""
    await register(generation_client)
    generation_app.state.vocabulary_generation.settings = database.settings.model_copy(
        update={"vocabulary_max_words": 30}
    )
    _, response = await start_job(generation_client, target_count=60)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "vocabulary_target_unsupported"
    listing = (await generation_client.get("/api/vocabulary/me/topics")).json()
    assert listing["usage"]["jobs_started"] == 0


async def test_sixty_word_generation_completes_with_bounded_batches(
    generation_client: AsyncClient, generation_app: FastAPI
) -> None:
    """The approved 60-word target completes and publishes exactly 60 words."""
    await register(generation_client)
    request_id, started = await start_job(generation_client, target_count=60)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "completed"
    assert completed["validated_count"] == 60
    detail = await generation_client.get(
        f"/api/vocabulary/me/topics/{completed['topic_id']}"
    )
    assert len(detail.json()["words"]) == 60
    messages = generation_app.state.test_llm.messages
    assert len(messages) == 10
    assert all(1 <= message["batch_size"] <= 6 for message in messages)
    usage = (await generation_client.get("/api/vocabulary/me/topics")).json()["usage"]
    assert usage["calls_used"] == 10
    assert usage["calls_reserved"] == 10


@pytest.mark.parametrize(
    ("script", "expected_code", "calls_used"),
    [
        ([HTTPException(429, "private rate limit")], "provider_rate_limited", 1),
        (
            [
                HTTPException(502, "private outage"),
                HTTPException(502, "private outage"),
            ],
            "provider_unavailable",
            2,
        ),
        ([HTTPException(504, "private timeout")], "provider_timeout", 1),
    ],
)
async def test_provider_failures_consume_sent_calls_and_refund_the_rest(
    generation_client: AsyncClient,
    generation_app: FastAPI,
    script: list[BaseException],
    expected_code: str,
    calls_used: int,
) -> None:
    """429/502/timeout are terminal or retried once, never silently free."""
    await register(generation_client)
    generation_app.state.test_llm.script = list(script)
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "failed"
    assert completed["error_code"] == expected_code
    assert "private" not in str(completed)
    listing = (await generation_client.get("/api/vocabulary/me/topics")).json()
    assert listing["topics"] == []
    assert listing["usage"]["calls_used"] == calls_used
    assert listing["usage"]["calls_reserved"] == calls_used


@pytest.mark.parametrize(
    ("status", "error_code"),
    [("refused", "refused"), ("needs_clarification", "needs_clarification")],
)
async def test_provider_refusal_and_clarification_are_terminal(
    generation_client: AsyncClient,
    generation_app: FastAPI,
    status: str,
    error_code: str,
) -> None:
    """A refusal or clarification response must not publish a partial topic."""
    await register(generation_client)
    generation_app.state.test_llm.script = [
        {
            "status": status,
            "topic": None,
            "words": [],
            "reason_code": "unsafe" if status == "refused" else "too_broad",
            "suggestions": ["office routines"],
        }
    ]
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "failed"
    assert completed["error_code"] == error_code
    assert (await generation_client.get("/api/vocabulary/me/topics")).json()[
        "topics"
    ] == []


async def test_partial_validation_repairs_only_the_remaining_words(
    generation_client: AsyncClient, generation_app: FastAPI
) -> None:
    """Invalid words are skipped and the repair call asks only for the gap."""
    await register(generation_client)
    valid = [generated_word(index) for index in range(1, 6)]
    invalid = {**generated_word(99), "example_en": "This example omits the term."}
    generation_app.state.test_llm.script = [
        generated_response(0, words=[*valid, invalid])
    ]
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "completed"
    messages = generation_app.state.test_llm.messages
    assert messages[0]["batch_size"] == 6
    assert messages[1]["batch_size"] == 1
    detail = await generation_client.get(
        f"/api/vocabulary/me/topics/{completed['topic_id']}"
    )
    terms = [word["term"] for word in detail.json()["words"]]
    assert len(terms) == len(set(terms)) == 30
    assert "word99" not in terms


async def test_seven_word_batch_is_rejected_and_retried_without_leaking_terms(
    generation_client: AsyncClient, generation_app: FastAPI
) -> None:
    """A batch above the six-word contract cannot be partially accepted."""
    await register(generation_client)
    poison = []
    for index in range(1, 8):
        word = generated_word(index)
        word.update(term=f"poison{index}", example_en=f"This is poison{index}.")
        poison.append(word)
    generation_app.state.test_llm.script = [generated_response(0, words=poison)]
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    completed = await finish_job(generation_app, generation_client, request_id)
    assert completed["status"] == "completed"
    detail = await generation_client.get(
        f"/api/vocabulary/me/topics/{completed['topic_id']}"
    )
    assert not any(word["term"].startswith("poison") for word in detail.json()["words"])
    assert generation_app.state.test_llm.messages[0]["batch_size"] == 6


async def test_cancel_stops_local_work_and_refunds_only_unsent_calls(
    generation_client: AsyncClient, generation_app: FastAPI
) -> None:
    """Cancellation is durable first, idempotent later and leaves no topic."""
    await register(generation_client)
    scripted = generation_app.state.test_llm
    scripted.block_first = True
    request_id, started = await start_job(generation_client)
    assert started.status_code == 202
    await asyncio.wait_for(scripted.started.wait(), timeout=10)
    cancelled = await generation_client.post(
        f"/api/vocabulary/generations/{request_id}/cancel"
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    await generation_app.state.vocabulary_jobs.drain()
    repeated = await generation_client.post(
        f"/api/vocabulary/generations/{request_id}/cancel"
    )
    assert repeated.status_code == 200
    assert repeated.json()["status"] == "cancelled"
    polled = await generation_client.get(f"/api/vocabulary/generations/{request_id}")
    assert polled.json()["status"] == "cancelled"
    assert polled.json()["topic_id"] is None
    listing = (await generation_client.get("/api/vocabulary/me/topics")).json()
    assert listing["topics"] == []
    assert listing["usage"]["calls_used"] == 1
    assert listing["usage"]["calls_reserved"] == 1


def _insert_job(
    database: Database,
    user_id: int,
    request_id: str,
    *,
    created: object,
    expires: object,
    reserved: int,
    used: int,
) -> None:
    """Create one deliberately stale durable job for recovery tests."""
    with database.transaction() as connection:
        connection.execute(
            generation_jobs.insert().values(
                UserId=user_id,
                RequestId=request_id,
                AuthSessionId=0,
                Kind="vocabulary_generation",
                PayloadHash="a" * 64,
                TargetCount=30,
                BatchSize=6,
                CefrLevel="A2",
                Status="running",
                ValidatedCount=0,
                CallsReserved=reserved,
                CallsUsed=used,
                TopicId=None,
                ErrorCode=None,
                CreatedAt=created,
                UpdatedAt=created,
                ExpiresAt=expires,
                FinishedAt=None,
            )
        )


async def test_stale_jobs_recover_at_startup_and_lazily_without_recounting(
    generation_app: FastAPI, database: Database
) -> None:
    """Expired work becomes failed/interrupted and refunds exactly the unsent."""
    user_id = 99991
    created = now() - timedelta(minutes=10)
    expires = now() - timedelta(minutes=1)
    request_id = str(uuid4())
    _insert_job(
        database,
        user_id,
        request_id,
        created=created,
        expires=expires,
        reserved=10,
        used=3,
    )
    with database.transaction() as connection:
        connection.execute(
            usage.insert().values(
                UserId=user_id,
                UsageDate=created.date(),
                JobsStarted=1,
                CallsReserved=10,
                CallsUsed=3,
                UpdatedAt=created,
            )
        )

    service = generation_app.state.vocabulary_generation
    assert service.recover_stale_jobs() == 1
    with database.transaction() as connection:
        job = (
            connection.execute(
                select(generation_jobs).where(
                    generation_jobs.c.UserId == user_id,
                    generation_jobs.c.RequestId == request_id,
                )
            )
            .mappings()
            .one()
        )
        assert job["Status"] == "failed"
        assert job["ErrorCode"] == "interrupted"
        assert job["FinishedAt"] is not None
        row = (
            connection.execute(
                select(usage).where(
                    usage.c.UserId == user_id, usage.c.UsageDate == created.date()
                )
            )
            .mappings()
            .one()
        )
        assert row["JobsStarted"] == 1
        assert row["CallsUsed"] == 3
        assert row["CallsReserved"] == 3

    lazy_id = str(uuid4())
    _insert_job(
        database,
        user_id,
        lazy_id,
        created=created,
        expires=expires,
        reserved=6,
        used=2,
    )
    with database.transaction() as connection:
        connection.execute(
            usage.update()
            .where(usage.c.UserId == user_id, usage.c.UsageDate == created.date())
            .values(
                CallsReserved=usage.c.CallsReserved + 6,
                CallsUsed=usage.c.CallsUsed + 2,
            )
        )
    lazy = service.job(user_id, lazy_id)
    assert lazy["status"] == "failed"
    assert lazy["error_code"] == "interrupted"
    with database.transaction() as connection:
        row = (
            connection.execute(
                select(usage).where(
                    usage.c.UserId == user_id, usage.c.UsageDate == created.date()
                )
            )
            .mappings()
            .one()
        )
        assert row["CallsReserved"] == 5
        assert row["CallsUsed"] == 5
        assert row["JobsStarted"] == 1


def test_concurrent_starts_reserve_one_process_slot_and_one_job() -> None:
    """Two real connections cannot both reserve the same owner's single slot."""
    configured = os.getenv("MYSQL_TEST_URL")
    if not configured:
        pytest.skip("Requires the explicitly isolated MySQL test database.")
    url = make_url(configured)
    assert url.database and url.database.endswith("_test")
    assert url.host in {"localhost", "127.0.0.1", "::1"}
    assert url.username and url.username != "root"
    settings = Settings(
        llm_provider="mock",
        database_mysql_url=SecretStr(configured),
        jwt_secret=SecretStr("test-secret-with-at-least-thirty-two-characters"),
    )
    db = Database(settings)
    user_id: int | None = None
    try:
        with db.transaction() as connection:
            repo = Repository(db, connection)
            users = db.models.table("Users", connection)
            assert connection.execute(select(users.c.UserId)).first() is None
            suffix = uuid4().hex[:8]
            user = repo.insert(
                "Users",
                Username="gen" + suffix,
                Email="gen" + suffix + "@example.test",
                PasswordHash="test-placeholder-not-used-for-authentication",
            )
            user_id = int(user["UserId"])
        service = VocabularyGenerationService(
            db,
            settings,
            VocabularyJobManager(settings),
            AuthLimiter(10),
        )
        data = [
            GenerationCreate(
                client_request_id=uuid4(),
                topic="fruits for breakfast",
                target_count=30,
            ),
            GenerationCreate(
                client_request_id=uuid4(),
                topic="office routines",
                target_count=30,
            ),
        ]
        barrier = Barrier(2)

        def start(item: GenerationCreate) -> tuple[int, str]:
            barrier.wait(timeout=10)
            assert user_id is not None
            service.prepare_start({"UserId": user_id, "SessionId": 0}, item)
            return user_id, str(item.client_request_id)

        successes: list[tuple[int, str]] = []
        failures: list[HTTPException] = []
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(start, item) for item in data]
            for future in futures:
                try:
                    successes.append(future.result(timeout=30))
                except HTTPException as exc:
                    failures.append(exc)
        assert len(successes) == 1
        assert len(failures) == 1
        assert isinstance(failures[0].detail, dict)
        assert failures[0].detail["code"] == "vocabulary_too_many_jobs"
        with db.transaction() as connection:
            rows = connection.execute(
                select(generation_jobs).where(generation_jobs.c.UserId == user_id)
            ).all()
            usage_row = (
                connection.execute(select(usage).where(usage.c.UserId == user_id))
                .mappings()
                .one()
            )
            assert len(rows) == 1
            assert usage_row["JobsStarted"] == 1
            assert usage_row["CallsReserved"] == 10
    finally:
        if user_id is not None:
            with db.transaction() as connection:
                connection.execute(
                    generation_jobs.delete().where(generation_jobs.c.UserId == user_id)
                )
                connection.execute(usage.delete().where(usage.c.UserId == user_id))
                users = db.models.table("Users", connection)
                connection.execute(users.delete().where(users.c.UserId == user_id))
        db.close()
