"""Offline wire, checkpoint, retry, cap and provenance tests for step one only."""

import asyncio
import json
from datetime import UTC, datetime, timedelta
from email.utils import format_datetime
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from evals.scope import language_live as live
from evals.scope import run

REPLY = (
    "I only help with English, so I cannot write code. "
    "What department do you work in at your company?"
)


@pytest.fixture(autouse=True)
def isolate_historical_campaign_hashes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Exercise old bounded mechanics offline; production keeps its frozen guard."""
    monkeypatch.setattr(
        live,
        "PROMPT_SHA256",
        run.digest((run.PROMPTS / "persona.v7.txt").read_text(encoding="utf-8")),
    )
    monkeypatch.setattr(
        live,
        "CORPUS_SHA256",
        run.digest((run.ROOT / "cases.jsonl").read_text(encoding="utf-8")),
    )


@pytest.fixture
def anyio_backend() -> str:
    """Use the application's asyncio backend without external APIs."""
    return "asyncio"


def settings() -> Settings:
    """Use a fake key that must never appear in saved outputs."""
    return Settings(gemini_api_key=SecretStr("offline-only-key"))


def response(status: int, retry_after: str = "") -> httpx.Response:
    """Supply real adapter SSE for success and private error bodies otherwise."""
    if status != 200:
        return httpx.Response(
            status,
            headers={"Retry-After": retry_after} if retry_after else {},
            text="private-upstream-body offline-only-key",
        )
    event = {
        "candidates": [
            {"content": {"parts": [{"text": REPLY}]}, "finishReason": "STOP"}
        ]
    }
    return httpx.Response(200, text="data: " + json.dumps(event) + "\n\n")


def test_cli_is_offline_and_never_reads_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Expose only the six-case step-one plan, with no full-suite option."""
    monkeypatch.setattr("sys.argv", ["language-live"])
    with patch.object(live, "dotenv_values") as credentials:
        live.main()
    credentials.assert_not_called()
    assert len(live.inputs()) == 6


@pytest.mark.parametrize(
    ("english", "outcome"), [(14, "propose_B_not_applied"), (15, "keep_A")]
)
def test_precommitted_language_boundary(english: int, outcome: str) -> None:
    """Keep the fixed denominator and give unknown/mixed replies no English credit."""
    rows = [
        {"data_status": "response_available", "language_hint": "en"}
        for _ in range(english)
    ] + [
        {"data_status": "response_available", "language_hint": "unknown"}
        for _ in range(18 - english)
    ]
    assert live.language_decision(rows) == {
        "english": english,
        "denominator": 18,
        "required_english": 15,
        "outcome": outcome,
    }
    rows[-1]["data_status"] = "not_run"
    assert live.language_decision(rows)["outcome"] == "incomplete_stop_waiting_for_user"


def test_screening_keeps_first_physical_lines_and_separates_mixed() -> None:
    """Expose full first lines for all slots, escaping Markdown without truncation."""
    rows = [
        {
            "slot": slot,
            "case_id": f"case-{slot}",
            "repetition": 1,
            "language_hint": "unknown" if slot in (2, 14) else "en",
            "language_review_required": slot in (2, 14),
            "reply": f"First line {slot}. Still first | <line>.\nSecond line.",
        }
        for slot in range(1, 19)
    ]
    markdown = "\n".join(live.first_lines(rows))
    for row in rows:
        assert f"| {row['slot']} | {row['case_id']} |" in markdown
    assert "First line 18. Still first &#124; &lt;line&gt;." in markdown
    assert "Second line." not in markdown
    assert "Chưa rõ / trộn: 2 lượt" in markdown
    assert "- Slot 2, case-2, lần 1:" in markdown
    assert "- Slot 14, case-14, lần 1:" in markdown


@pytest.mark.parametrize(
    ("header", "expected"),
    [(None, 0), ("-1", 0), ("nan", 0), ("bad", 0), ("12.5", 12.5)],
)
def test_retry_after_numeric_and_invalid_values(
    header: str | None, expected: float
) -> None:
    """Never retain raw header text or accept nonfinite/negative delays."""
    assert live.retry_after_seconds(header) == expected


def test_retry_after_supports_http_dates() -> None:
    """Honor the HTTP-date form as well as delta seconds."""
    current = datetime(2026, 11, 13, tzinfo=UTC)
    with patch.object(live, "now", return_value=current):
        assert (
            live.retry_after_seconds(format_datetime(current + timedelta(seconds=42)))
            == 42
        )


@pytest.mark.anyio
@pytest.mark.parametrize("first_status", [200, 502, 429])
async def test_step_one_wire_retry_and_429_stop(
    tmp_path: Path, first_status: int
) -> None:
    """Checkpoint before each request, redact errors and stop immediately on quota."""
    output = tmp_path / "pilot"
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        ledger = live.read_rows(output / "attempts.jsonl")
        assert len(ledger) == len(requests)
        payload = json.loads(request.content)
        assert payload["systemInstruction"]["parts"][0]["text"].endswith(
            ("Learner level: A1", "Learner level: B1", "Learner level: C1")
        )
        assert len(payload["contents"]) == 3
        return response(first_status if len(requests) == 1 else 200, "13")

    with patch.object(asyncio, "sleep", new_callable=AsyncMock) as delay:
        await live.execute(settings(), output, transport=httpx.MockTransport(handler))
    expected = 1 if first_status == 429 else 19 if first_status == 502 else 18
    assert len(requests) == expected
    rows = live.read_rows(output / "results.jsonl")
    assert len(rows) == expected
    summary = json.loads((output / "summary.json").read_text(encoding="utf-8"))
    assert summary["request_budget"] == 36
    assert sum(row["responses"] for row in summary["by_case"]) == (
        0 if first_status == 429 else 18
    )
    if first_status == 502:
        assert rows[0]["terminal"] is False
        assert rows[1]["retry"] == 1 and rows[1]["terminal"]
        assert delay.call_args_list[1].args[0] > 12
    if first_status == 429:
        assert summary["stop_reason"] == "http_429_stopped_waiting_for_user"
        assert sum(row["not_run_or_pending"] for row in summary["by_case"]) == 17
    for filename in ("metadata.json", "summary.json"):
        metadata = json.loads((output / filename).read_text(encoding="utf-8"))
        assert metadata["date"] == live.DATE
        assert metadata["model"] == settings().gemini_chat_model
        assert metadata["prompt_sha256"] == live.PROMPT_SHA256
    assert all(
        row["prompt_sha256"] == live.PROMPT_SHA256 and row["date"] == live.DATE
        for row in rows
    )
    assert all(
        "offline-only-key" not in path.read_text(encoding="utf-8-sig")
        and "private-upstream-body" not in path.read_text(encoding="utf-8-sig")
        for path in output.iterdir()
    )


@pytest.mark.anyio
async def test_all_502s_use_exactly_one_retry_per_slot_and_never_exceed_36(
    tmp_path: Path,
) -> None:
    """Bound the pathological failure case without creating a retry loop."""
    output = tmp_path / "all-failed"
    transport = httpx.MockTransport(lambda request: response(502))
    with patch.object(asyncio, "sleep", new_callable=AsyncMock):
        await live.execute(settings(), output, transport=transport)
        await live.execute(settings(), output, transport=transport, resume=True)
    rows = live.read_rows(output / "results.jsonl")
    assert len(rows) == len(live.read_rows(output / "attempts.jsonl")) == 36
    assert sum(row["terminal"] for row in rows) == 18
    assert all(row["retry"] in (0, 1) for row in rows)
    summary = json.loads((output / "summary.json").read_text(encoding="utf-8"))
    assert sum(row["no_data"] for row in summary["by_case"]) == 18


@pytest.mark.anyio
async def test_long_retry_after_pauses_without_early_retry(tmp_path: Path) -> None:
    """Checkpoint a retry deadline longer than 60s and return control promptly."""
    output = tmp_path / "deferred"
    with patch.object(asyncio, "sleep", new_callable=AsyncMock):
        await live.execute(
            settings(),
            output,
            transport=httpx.MockTransport(lambda request: response(502, "120")),
        )
    assert len(live.read_rows(output / "attempts.jsonl")) == 1
    summary = json.loads((output / "summary.json").read_text(encoding="utf-8"))
    assert summary["stop_reason"] == "retry_after_pause_resume_later"


@pytest.mark.anyio
async def test_resume_never_replays_unresolved_attempt_or_accepts_changed_model(
    tmp_path: Path,
) -> None:
    """Treat an interrupted request as missing data; resume only remaining slots."""
    output = tmp_path / "resume"
    with patch.object(asyncio, "sleep", new_callable=AsyncMock):
        await live.execute(
            settings(),
            output,
            transport=httpx.MockTransport(lambda request: response(429)),
        )
        # Simulate a crash after ledger persistence and before result persistence.
        (output / "results.jsonl").write_text("", encoding="utf-8")
        await live.execute(
            settings(),
            output,
            resume=True,
            transport=httpx.MockTransport(lambda request: response(200)),
        )
    rows = live.read_rows(output / "results.jsonl")
    assert len(rows) == 18 and rows[0]["error"] == "interrupted_unconfirmed"
    assert sum("reply" in row for row in rows) == 17
    changed = settings().model_copy(update={"gemini_chat_model": "gemini-other"})
    with pytest.raises(ValueError, match="metadata changed"):
        await live.execute(changed, output, resume=True)
    assert len(live.read_rows(output / "attempts.jsonl")) == 18
