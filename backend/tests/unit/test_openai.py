"""Validate the real OpenAI HTTP contract through isolated transport fixtures."""

import json

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.llm.openai import OpenAILLMClient

pytestmark = pytest.mark.anyio


def sse(*events: dict[str, object]) -> httpx.Response:
    """Build provider fixtures; application code never imports this helper."""
    return httpx.Response(
        200,
        text="".join("data: " + json.dumps(event) + "\n\n" for event in events),
        headers={"content-type": "text/event-stream"},
    )


async def test_structured_context_and_incremental_response() -> None:
    """Send history as data, not instructions; forward the actual provider deltas."""

    def handler(request: httpx.Request) -> httpx.Response:
        data = json.loads(request.content)
        assert request.url == "https://api.openai.com/v1/responses"
        assert request.headers["Authorization"] == "Bearer test-only-key"
        assert data["stream"] is True and data["store"] is False
        assert data["max_output_tokens"] == 800
        assert data["input"] == [
            {"role": "user", "content": "My favorite color is red."},
            {"role": "assistant", "content": "Got it."},
            {"role": "user", "content": "What is my favorite color?"},
        ]
        assert "red" not in data["instructions"]
        return sse(
            {"type": "response.created"},
            {"type": "response.output_text.delta", "delta": "Your favorite "},
            {"type": "response.output_text.delta", "delta": "color is red."},
            {"type": "response.completed"},
        )

    client = OpenAILLMClient(
        Settings(openai_api_key=SecretStr("test-only-key")),
        httpx.MockTransport(handler),
    )
    chunks = [
        text
        async for text in client.stream(
            "What is my favorite color?",
            "A2",
            "Test instructions",
            [
                {"role": "user", "content": "My favorite color is red."},
                {"role": "assistant", "content": "Got it."},
            ],
        )
    ]
    assert chunks == ["Your favorite ", "color is red."]


@pytest.mark.parametrize(
    "status,expected", [(401, 503), (403, 503), (429, 429), (500, 502), (302, 502)]
)
async def test_provider_http_errors_are_real_and_private(
    status: int, expected: int
) -> None:
    """Invalid keys/quota/provider failure never become a canned success."""
    client = OpenAILLMClient(
        Settings(openai_api_key=SecretStr("test-only-key")),
        httpx.MockTransport(
            lambda request: httpx.Response(status, text="private provider content")
        ),
    )
    with pytest.raises(HTTPException) as error:
        await client.generate("Hello", "A2", "Prompt")
    assert error.value.status_code == expected
    assert (
        "private" not in error.value.detail
        and "test-only-key" not in error.value.detail
    )


@pytest.mark.parametrize(
    "events",
    [
        [],
        [{"type": "response.completed"}],
        [{"type": "response.output_text.delta", "delta": "unfinished"}],
        [{"type": "response.failed"}],
        [{"type": "response.incomplete"}],
        [{"type": "error"}],
        [{"type": "response.output_text.delta", "delta": 3}],
        [{"type": "response.output_text.delta", "delta": "x" * 12001}],
    ],
)
async def test_broken_or_incomplete_streams_fail(
    events: list[dict[str, object]],
) -> None:
    """Partial text is never misreported as a completed assistant response."""
    client = OpenAILLMClient(
        Settings(openai_api_key=SecretStr("test-only-key")),
        httpx.MockTransport(lambda request: sse(*events)),
    )
    with pytest.raises(HTTPException) as error:
        await client.generate("Hello", "A2", "Prompt")
    assert error.value.status_code == 502


async def test_missing_key_timeout_and_invalid_json() -> None:
    """Bound slow/bad transport without exposing keys or silently replacing AI."""
    with pytest.raises(HTTPException) as error:
        await OpenAILLMClient(Settings()).generate("Hello", "A2", "Prompt")
    assert error.value.status_code == 503

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("test")

    client = OpenAILLMClient(
        Settings(openai_api_key=SecretStr("test-only-key")),
        httpx.MockTransport(timeout),
    )
    with pytest.raises(HTTPException) as error:
        await client.generate("Hello", "A2", "Prompt")

    assert error.value.status_code == 504
    client.transport = httpx.MockTransport(
        lambda request: httpx.Response(200, text="data: broken\n\n")
    )
    with pytest.raises(HTTPException):
        await client.generate("Hello", "A2", "Prompt")


async def test_quota_failure_inside_http_200_stream_is_reported() -> None:
    """HTTP 200 is not success if OpenAI streams insufficient_quota afterward."""
    client = OpenAILLMClient(
        Settings(openai_api_key=SecretStr("test-only-key")),
        httpx.MockTransport(
            lambda request: sse(
                {
                    "type": "error",
                    "error": {
                        "type": "insufficient_quota",
                        "code": "credit_balance_exhausted",
                    },
                }
            )
        ),
    )
    with pytest.raises(HTTPException) as error:
        await client.generate("Hello", "A2", "Prompt")
    assert error.value.status_code == 429
    assert "quota" in error.value.detail
