"""Gemini transport/configuration regression tests without real API calls."""

import json

import httpx
import pytest
from fastapi import HTTPException, Request
from pydantic import SecretStr, ValidationError

from app.api.dependencies import get_llm_client
from app.core.config import Settings, get_settings
from app.llm.gemini import GeminiLLMClient
from app.main import create_app

pytestmark = pytest.mark.anyio


def settings() -> Settings:
    """Keep test-only credentials separate from local environment secrets."""
    return Settings(gemini_api_key=SecretStr("gemini-test-key"))


def sse(*events: object) -> httpx.Response:
    """Represent the actual streamGenerateContent SSE envelope."""
    return httpx.Response(
        200, text="".join("data: " + json.dumps(e) + "\n\n" for e in events)
    )


async def test_context_roles_auth_deltas_and_final_status() -> None:
    """Map assistant to model, hide thoughts and require STOP before success."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "generativelanguage.googleapis.com"
        assert request.url.path.endswith("/gemini-3.5-flash-lite:streamGenerateContent")
        assert dict(request.url.params) == {"alt": "sse"}
        assert request.headers["x-goog-api-key"] == "gemini-test-key"
        assert "gemini-test-key" not in str(request.url)
        data = json.loads(request.content)
        assert data["contents"] == [
            {"role": "user", "parts": [{"text": "My name is Linh."}]},
            {"role": "model", "parts": [{"text": "Hi Linh."}]},
            {"role": "user", "parts": [{"text": "My name?"}]},
        ]
        assert "Linh" not in str(data["systemInstruction"])
        assert data["generationConfig"]["maxOutputTokens"] == 2048
        return sse(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {"text": "private reasoning", "thought": True},
                                {"text": "Linh"},
                            ]
                        }
                    }
                ]
            },
            {
                "candidates": [
                    {"content": {"parts": [{"text": "."}]}, "finishReason": "STOP"}
                ]
            },
        )

    client = GeminiLLMClient(settings(), httpx.MockTransport(handler))
    chunks = [
        part
        async for part in client.stream(
            "My name?",
            "A2",
            "Prompt",
            [
                {"role": "user", "content": "My name is Linh."},
                {"role": "assistant", "content": "Hi Linh."},
            ],
        )
    ]
    assert chunks == ["Linh", "."]


@pytest.mark.parametrize(
    "status,expected",
    [
        (400, 503),
        (401, 503),
        (403, 503),
        (404, 503),
        (429, 429),
        (500, 502),
        (302, 502),
    ],
)
async def test_http_errors_private(status: int, expected: int) -> None:
    """Never turn rejected credentials/quota/provider errors into fake replies."""
    client = GeminiLLMClient(
        settings(),
        httpx.MockTransport(
            lambda _: httpx.Response(status, text="private-provider-body")
        ),
    )
    with pytest.raises(HTTPException) as error:
        await client.generate("Hello", "A2", "Prompt")
    assert error.value.status_code == expected
    assert "private-provider-body" not in error.value.detail
    assert "gemini-test-key" not in error.value.detail


@pytest.mark.parametrize(
    "events",
    [
        [],
        {},
        {"candidates": []},
        {"candidates": [{"finishReason": "STOP"}]},
        {"candidates": [{"content": {"parts": [{"text": "unfinished"}]}}]},
        {
            "candidates": [
                {"content": {"parts": [{"text": "cut"}]}, "finishReason": "MAX_TOKENS"}
            ]
        },
        {"candidates": [{"finishReason": "SAFETY"}]},
        {"candidates": [{"content": {"parts": [{"text": 1}]}}]},
        {"candidates": [{"content": {"parts": [{"text": "x" * 12001}]}}]},
        {"error": {"code": 500}},
    ],
)
async def test_invalid_empty_partial_or_blocked_stream(events: object) -> None:
    """Incomplete candidates must remain failed in application persistence."""
    client = GeminiLLMClient(settings(), httpx.MockTransport(lambda _: sse(events)))
    with pytest.raises(HTTPException) as error:
        await client.generate("Hello", "A2", "Prompt")
    assert error.value.status_code == 502


async def test_missing_key_timeout_block_and_malformed_json() -> None:
    """Bound slow or malformed responses and report prompt blocking explicitly."""
    with pytest.raises(HTTPException) as error:
        await GeminiLLMClient(Settings()).generate("Hi", "A2", "Prompt")
    assert error.value.status_code == 503

    def timeout(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("private")

    client = GeminiLLMClient(settings(), httpx.MockTransport(timeout))
    with pytest.raises(HTTPException) as error:
        await client.generate("Hi", "A2", "Prompt")
    assert error.value.status_code == 504
    client.transport = httpx.MockTransport(
        lambda _: sse({"promptFeedback": {"blockReason": "SAFETY"}})
    )
    with pytest.raises(HTTPException) as error:
        await client.generate("Hi", "A2", "Prompt")
    assert error.value.status_code == 422
    client.transport = httpx.MockTransport(
        lambda _: httpx.Response(200, text="data: not-json\n\n")
    )
    with pytest.raises(HTTPException) as error:
        await client.generate("Hi", "A2", "Prompt")
    assert error.value.status_code == 502


async def test_factory_capabilities_and_private_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Explicit native mode enables Gemini Live without substituting OpenAI."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("VOICE_PROVIDER", "native")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    config = get_settings()
    assert config.chat_configured and config.openai_api_key is None
    assert "gemini-test-key" not in str(config)
    app = create_app(config)
    assert isinstance(
        get_llm_client(Request({"type": "http", "app": app})), GeminiLLMClient
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        cap = (await client.get("/api/capabilities")).json()
        assert (
            cap["provider"] == "gemini"
            and cap["chat"]
            and cap["streaming"]
            and cap["realtime"]
        )
    with pytest.raises(ValidationError):
        Settings(gemini_chat_model="../invalid?key=private")
