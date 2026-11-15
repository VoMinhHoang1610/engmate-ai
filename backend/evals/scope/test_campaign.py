"""Offline policy-B, gate, bounded transport, resume and stratified export tests."""

import asyncio
import json
from collections import Counter
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from evals.scope import campaign as live
from evals.scope.language_live import read_rows
from evals.scope.screening import (
    explicit_reply_language,
    refusal_expected_language,
    refusal_language_signal,
    refusal_mixing,
)

VI = "Mình chỉ giúp học tiếng Anh. Bạn làm việc ở bộ phận nào?"
EN = "I only help with English. What department do you work in?"


@pytest.fixture
def anyio_backend() -> str:
    """Use asyncio with fake HTTP only."""
    return "asyncio"


def settings() -> Settings:
    """Keep test credentials fake and check they are redacted."""
    return Settings(gemini_api_key=SecretStr("offline-only-key"))


def response(request: httpx.Request, status: int = 200) -> httpx.Response:
    """Select fixture language from English or Vietnamese conversation history."""
    if status != 200:
        return httpx.Response(
            status, headers={"Retry-After": "13"}, text="private-body offline-only-key"
        )
    reply = VI
    event = {
        "candidates": [
            {"content": {"parts": [{"text": reply}]}, "finishReason": "STOP"}
        ]
    }
    return httpx.Response(200, text="data: " + json.dumps(event) + "\n\n")


def test_exact_plans_and_offline_cli(monkeypatch: pytest.MonkeyPatch) -> None:
    """No arbitrary plans, hidden judge calls or credentials in the dry run."""
    with pytest.raises(ValueError):
        live.plan("pilot")
    full = live.plan("full")
    assert Counter(v for _, v, _ in full) == {"persona.v7": 744, "persona.v6": 306}
    assert Counter(c.group for c, v, _ in full if v == "persona.v6") == {
        "out_of_scope": 216,
        "adversarial": 90,
    }
    with pytest.raises(ValueError):
        live.plan("judge")
    monkeypatch.setattr("sys.argv", ["campaign"])
    with patch.object(live, "dotenv_values") as credentials:
        live.main()
    credentials.assert_not_called()


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("Write a Python function that sorts numbers.", "vi"),
        ("Please reply in English. Write a Python function.", "en"),
        ("Trả lời bằng tiếng Anh: giải bài toán này.", "en"),
        ("tra loi bang tieng Anh: viet code Python", "en"),
        ("Please answer in Vietnamese: write code.", "vi"),
        ("English only, please. Write code.", "en"),
    ],
)
def test_default_vietnamese_has_explicit_response_language_override(
    message: str, expected: str
) -> None:
    """English wording/history/practice alone is not an explicit reply directive."""
    assert refusal_expected_language(message, []) == expected
    assert (
        refusal_expected_language(
            message,
            [{"role": "user", "content": "I want to practice workplace English."}],
        )
        == expected
    )
    assert (
        explicit_reply_language('Explain the quoted sentence "Reply in English".')
        is None
    )


@pytest.mark.parametrize(
    ("text", "mixed"),
    [
        (VI, False),
        (EN, False),
        ('Mình chỉ dạy tiếng Anh. Ví dụ: "I work in sales." Bạn thử nhé?', False),
        ("Cô chỉ dạy tiếng Anh. Let's practice office introductions.", False),
        ("Mình chỉ dạy tiếng Anh. What is your job?", False),
        ("Minh chi giup tieng Anh. What is your job?", False),
        ("Mình chỉ hỗ trợ tiếng Anh. Ví dụ: I work in sales.", False),
        ("Mình chỉ hỗ trợ học tiếng Anh với mẫu câu I work in.", False),
        ("Mình chỉ giúp tiếng Anh. I only help with English.", True),
        ("Mình chỉ help with English thôi nhé.", True),
        ("Xin lỗi, I cannot write code.", True),
        ("Sorry, mình chỉ giúp học tiếng Anh.", True),
        ("Từ department nghĩa là bộ phận. Bạn thử đặt câu nhé?", False),
    ],
)
def test_refusal_mixing_distinguishes_quoted_teaching(text: str, mixed: bool) -> None:
    """Do not confuse one English vocabulary word or a quoted example with prose."""
    assert refusal_mixing(text) is mixed


def test_language_signal_uses_refusal_not_allowed_practice() -> None:
    """Do not mistake a long English practice question for the refusal language."""
    assert (
        refusal_language_signal(
            VI + " What do you do at your company "
            "and how do you introduce your department?"
        )[0]
        == "vi"
    )


@pytest.fixture
def short_plan(monkeypatch: pytest.MonkeyPatch) -> None:
    """Exercise the identical engine on a test-only ten-slot plan, never real APIs."""
    cases = [
        c
        for c in live.inputs()
        if c.id.startswith(("refusal-language-", "refusal-english-conversation-"))
    ]
    monkeypatch.setattr(
        live, "plan", lambda stage: [(c, "persona.v7", 1) for c in cases]
    )


@pytest.mark.anyio
@pytest.mark.parametrize("first_status", [200, 502, 429, 500])
async def test_sequential_wire_backoff_stop_and_provenance(
    tmp_path: Path,
    first_status: int,
    short_plan: None,
) -> None:
    """Persist before requests, retry only actual 502 once, and stop on 429."""
    output = tmp_path / "pilot"
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert len(read_rows(output / "attempts.jsonl")) == len(requests)
        return response(request, first_status if len(requests) == 1 else 200)

    with patch.object(asyncio, "sleep", new_callable=AsyncMock) as delay:
        summary = await live.execute(
            settings(), "full", output, transport=httpx.MockTransport(handler)
        )
    assert len(requests) == (
        1 if first_status == 429 else 11 if first_status == 502 else 10
    )
    assert summary["request_budget"] == 20
    if first_status == 502:
        assert delay.call_args_list[1].args[0] > 12
    if first_status == 429:
        assert summary["stop_reason"] == "http_429_stopped_waiting_for_user"
    if first_status == 200:
        assert summary["calls_used"] == 10
    assert all(
        "offline-only-key" not in p.read_text(encoding="utf-8-sig")
        and "private-body" not in p.read_text(encoding="utf-8-sig")
        for p in output.iterdir()
    )
    for name in ("metadata.json", "summary.json", "manual_sampling.json"):
        data = json.loads((output / name).read_text())
        assert data["prompt_sha256"] == live.PROMPT_SHA256
        assert (
            data["model"] == settings().gemini_chat_model and data["date"] == live.DATE
        )
    sampling = json.loads((output / "manual_sampling.json").read_text())
    assert sampling["strata"][0]["random_additional_cases"] >= 2


@pytest.mark.anyio
async def test_all_502s_stop_at_twice_plan_and_resume_uses_no_calls(
    tmp_path: Path,
    short_plan: None,
) -> None:
    """The shared engine's request ceiling is twice its fixed plan size."""
    output = tmp_path / "failed"
    transport = httpx.MockTransport(lambda req: response(req, 502))
    with patch.object(asyncio, "sleep", new_callable=AsyncMock):
        await live.execute(settings(), "full", output, transport=transport)
        result = await live.execute(
            settings(), "full", output, transport=transport, resume=True
        )
    assert result["calls_used"] == 20
    assert len(read_rows(output / "attempts.jsonl")) == 20


@pytest.mark.anyio
async def test_orphan_is_not_replayed_and_changed_model_is_rejected(
    tmp_path: Path,
    short_plan: None,
) -> None:
    """A crash cannot authorize another paid attempt for an unconfirmed request."""
    output = tmp_path / "resume"
    with patch.object(asyncio, "sleep", new_callable=AsyncMock):
        await live.execute(
            settings(),
            "full",
            output,
            transport=httpx.MockTransport(lambda req: response(req, 429)),
        )
        (output / "results.jsonl").write_text("")
        result = await live.execute(
            settings(),
            "full",
            output,
            resume=True,
            transport=httpx.MockTransport(response),
        )
    assert result["calls_used"] == 10
    assert read_rows(output / "results.jsonl")[0]["error"] == "interrupted_unconfirmed"
    with pytest.raises(ValueError, match="metadata changed"):
        await live.execute(
            settings().model_copy(update={"gemini_chat_model": "changed"}),
            "full",
            output,
            resume=True,
        )


@pytest.mark.anyio
async def test_full_generation_has_lock_and_never_runs_pilot_or_judge(
    tmp_path: Path,
) -> None:
    """Freeze the final hash before exactly one full-engine invocation."""
    with (
        patch.object(live, "OUTPUT", tmp_path),
        patch.object(
            live,
            "execute",
            new_callable=AsyncMock,
            return_value={},
        ) as execute,
    ):
        await live.campaign(settings())
    assert execute.await_count == 1 and execute.call_args.args[1] == "full"
    lock = json.loads((tmp_path / "PROMPT_LOCK.json").read_text())
    assert lock["pilot_calls"] == lock["judge_calls"] == 0
    assert lock["full_request_budget"] == 2100
