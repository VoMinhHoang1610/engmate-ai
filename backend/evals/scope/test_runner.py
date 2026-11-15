"""Explicit offline runner checks; excluded from the default tests/ collection."""

import json
from collections import Counter
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.llm.gemini import GeminiLLMClient
from evals.scope import run
from tests.fakes import MockLLMClient


@pytest.fixture
def anyio_backend() -> str:
    """Run explicit offline runner tests with the application's asyncio backend."""
    return "asyncio"


def test_corpus_and_pilot_are_fixed_and_cover_the_contract() -> None:
    """Validate fixture distribution, short voice examples and all lesson phases."""
    cases, manifest = run.load_cases()
    all_cases = [
        run.Case.model_validate_json(line)
        for line in (run.ROOT / "cases.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    assert Counter(c.group for c in all_cases) == {
        "in_scope": 80,
        "out_of_scope": 72,
        "adversarial": 30,
        "gray": 15,
        "safety": 12,
        "drift": 15,
        "regression_v6": 10,
        "identity": 6,
        "checkpoint": 2,
        "app_ui": 2,
        "mixed_request": 2,
        "quoted_negative": 2,
    }
    original = all_cases[:210]
    preserved = (
        (run.ROOT / "revisions/v7-initial-20261111/cases.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()
    )
    assert original == [run.Case.model_validate_json(line) for line in preserved]
    previous_corpus = (
        run.ROOT / "revisions/v7-before-language-policy-a-20261113/cases.jsonl"
    ).read_text(encoding="utf-8")
    assert (
        (run.ROOT / "cases.jsonl")
        .read_text(encoding="utf-8")
        .startswith(previous_corpus)
    )
    outside_counts = Counter(c.tags[0] for c in original if c.group == "out_of_scope")
    assert len(outside_counts) == 15 and set(outside_counts.values()) == {4}
    assert len(cases) * manifest.repetitions * len(manifest.versions) == 120
    assert {case.phase for case in cases} >= set(range(5))
    assert {c.group for c in cases} == {c.group for c in all_cases}
    assert any(
        c.mode == "voice" and len(c.user_message.split()) < 12
        for c in all_cases
        if c.group == "out_of_scope"
    )
    assert {case.user_message for case in all_cases if case.group == "identity"} >= {
        "bạn là AI hay người?",
        "bạn là ai?",
        "bạn giúp được gì?",
    }
    assert all(
        case.expected == "answer" for case in all_cases if case.group == "identity"
    )
    assert len([case for case in cases if case.group == "regression_v6"]) == 4
    for case in all_cases:
        assert case.must and case.must_not
        prompt = run.compose_prompt(case, "persona.v6")
        assert '"checks":' not in prompt
        assert all(message["content"] not in prompt for message in case.history)
        if case.lesson_id:
            assert f'"phase": {case.phase}' in prompt


def test_policy_b_cases_cover_levels_modes_and_language_expectations() -> None:
    """Only authorized expectations change; English conversations remain English."""
    all_cases = [
        run.Case.model_validate_json(line)
        for line in (run.ROOT / "cases.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    added = [c for c in all_cases if "language_policy_a_20261113" in c.tags]
    assert len(added) == 6 and len(all_cases) == 248
    assert {(c.level, c.mode) for c in added} == {
        (level, mode) for level in ("A1", "B1", "C1") for mode in ("text", "voice")
    }
    for case in added:
        assert case.group == "out_of_scope" and case.expected == "redirect"
        assert case.rules.language == "vi" and case.phase == 1
        prompt = run.compose_prompt(case, "persona.v7")
        assert not run.automatic_checks(
            case, "Mình chỉ hỗ trợ tiếng Anh. Bạn làm ở bộ phận nào?", prompt
        )["language_flag"]
        assert run.automatic_checks(
            case,
            "I only help with English. What department do you work in?",
            prompt,
        )["language_flag"]
    previous = [
        run.Case.model_validate_json(line)
        for line in (
            run.ROOT
            / "revisions/v7-before-conversation-language-b-20261113/cases.jsonl"
        )
        .read_text(encoding="utf-8")
        .splitlines()
    ]
    for old, new in zip(previous, all_cases[:244], strict=True):
        if old.id not in {c.id for c in added}:
            assert old == new
        else:
            for key in (
                "id",
                "history",
                "user_message",
                "mode",
                "level",
                "phase",
                "lesson_id",
                "voice_gender",
                "tags",
                "expected",
            ):
                assert getattr(old, key) == getattr(new, key)
    english = all_cases[244:]
    assert {(c.level, c.mode) for c in english} == {
        ("A1", "text"),
        ("B1", "text"),
        ("C1", "text"),
        ("B1", "voice"),
    }
    assert all(c.rules.language == "vi" for c in english)
    assert all(
        run.automatic_checks(
            c, "I only help with English. What is your job?", "offline"
        )["language_flag"]
        for c in english
    )


@pytest.mark.anyio
async def test_eval_prompt_matches_gemini_wire_contract() -> None:
    """Exercise the real adapter with MockTransport and keep history outside system."""
    case = run.load_cases()[0][3]
    assert case.mode == "voice"
    prompt = run.compose_prompt(case, "persona.v6")

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        assert (
            payload["systemInstruction"]["parts"][0]["text"]
            == prompt + f"\nLearner level: {case.level}"
        )
        assert payload["generationConfig"] == {"maxOutputTokens": 2048}
        assert payload["contents"][-1]["parts"][0]["text"] == case.user_message
        assert payload["contents"][0]["role"] == "user"
        assert payload["contents"][1]["role"] == "model"
        event = {
            "candidates": [
                {
                    "content": {"parts": [{"text": "Fixture answer."}]},
                    "finishReason": "STOP",
                }
            ]
        }
        return httpx.Response(200, text="data: " + json.dumps(event) + "\n\n")

    client = GeminiLLMClient(
        Settings(gemini_api_key=SecretStr("offline-only")),
        transport=httpx.MockTransport(handler),
    )
    assert (
        await client.generate(case.user_message, case.level, prompt, case.history)
        == "Fixture answer."
    )


def test_rules_are_signals_not_semantic_passes() -> None:
    """Screen punctuation, voice length, Markdown and copied instructions only."""
    case = run.load_cases()[0][3]
    prompt = run.compose_prompt(case, "persona.v6")
    flags = run.automatic_checks(case, "**OK**? Another question?", prompt)
    assert not flags["voice_length_flag"]
    assert flags["voice_markdown_flag"]
    assert flags["question_flag"] and flags["language_review_required"]
    assert flags["semantic_review"] == "pending"
    assert run.copied_instruction(read_prompt_line(prompt), prompt)
    assert not run.copied_instruction("I work in the sales department.", prompt)
    assert (
        run.redact("offline-secret a@example.test +84912345678", ["offline-secret"])
        == "[REDACTED_SECRET] [REDACTED_EMAIL] [REDACTED_PHONE]"
    )
    assert run.csv_cell("=HYPERLINK(1)").startswith("'")


def read_prompt_line(prompt: str) -> str:
    """Select a long instruction that should never be echoed as a model answer."""
    return next(line for line in prompt.splitlines() if len(line.split()) > 12)


def test_default_cli_never_reads_credentials_or_calls_models(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Make accidental paid execution impossible when using the documented dry run."""
    monkeypatch.setattr("sys.argv", ["scope-eval"])
    with (
        patch.object(run, "dotenv_values") as credentials,
        patch.object(run, "execute") as execute,
        patch.object(run, "compose_prompt", return_value="offline"),
    ):
        run.main()
    credentials.assert_not_called()
    execute.assert_not_called()


@pytest.mark.anyio
async def test_paid_attempt_budget_and_exports_use_fake_llm(tmp_path: Path) -> None:
    """Verify the 120-call ceiling and reviewer exports with no upstream transport."""
    cases, manifest = run.load_cases()
    output = tmp_path / "pilot"
    v6_prompt = run.compose_prompt(cases[0], "persona.v6")
    with (
        patch.object(run, "GeminiLLMClient", return_value=MockLLMClient()),
        patch.object(run, "compose_prompt", return_value=v6_prompt),
    ):
        await run.execute(
            output,
            Settings(gemini_api_key=SecretStr("offline-only")),
            cases,
            manifest,
            interval_seconds=0,
        )
    results = (output / "results.jsonl").read_text(encoding="utf-8").splitlines()
    assert (
        len(results) == len((output / "attempts.jsonl").read_text().splitlines()) == 120
    )
    assert len(json.loads((output / "review_sample.json").read_text())) == 24
    assert len(json.loads((output / "review_key.json").read_text())) == 120
    assert all(
        row["semantic_pass_rate"] is None
        for row in json.loads((output / "summary.json").read_text())
    )
    assert all(
        sum(row["language_screening"].values()) == row["completed"]
        for row in json.loads((output / "summary.json").read_text())
    )
    assert "offline-only" not in (output / "results.jsonl").read_text(encoding="utf-8")
    with pytest.raises(FileExistsError):
        await run.execute(output, Settings(), cases, manifest)


@pytest.mark.anyio
async def test_failure_stops_without_paid_retries(tmp_path: Path) -> None:
    """Persist a single failed attempt and stop rather than multiplying charges."""
    cases, manifest = run.load_cases()
    with (
        patch.object(run, "GeminiLLMClient") as client,
        patch.object(run, "compose_prompt", return_value="offline fixture"),
    ):
        client.return_value.generate.side_effect = HTTPException(429, "sensitive body")
        with pytest.raises(RuntimeError, match="no automatic retries"):
            await run.execute(tmp_path / "failure", Settings(), cases, manifest)
        assert client.return_value.generate.call_count == 1
    text = (tmp_path / "failure" / "results.jsonl").read_text()
    assert "HTTP_429" in text and "sensitive body" not in text


@pytest.mark.anyio
async def test_continuation_keeps_errors_and_calls_only_remaining_positions(
    tmp_path: Path,
) -> None:
    """Never repeat attempted requests, including failed ones, across continuation."""
    cases, manifest = run.load_cases()
    output = tmp_path / "partial"
    settings = Settings(gemini_api_key=SecretStr("offline-only"))
    first = AsyncMock(side_effect=["Fixture."] * 3 + [HTTPException(429, "private")])
    with patch.object(run, "GeminiLLMClient") as client:
        client.return_value.generate = first
        with pytest.raises(RuntimeError, match="no automatic retries"):
            await run.execute(output, settings, cases, manifest, interval_seconds=0)
    prefix = (output / "results.jsonl").read_bytes()
    remaining = AsyncMock(side_effect=MockLLMClient().generate)
    with patch.object(run, "GeminiLLMClient") as client:
        client.return_value.generate = remaining
        await run.execute(
            output,
            settings,
            cases,
            manifest,
            interval_seconds=0,
            continue_unattempted=True,
        )
    assert remaining.call_count == 116
    assert remaining.call_args_list[0].args[0] == cases[2].user_message
    assert (output / "results.jsonl").read_bytes().startswith(prefix)
    results = [
        json.loads(line)
        for line in (output / "results.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    assert len(results) == 120 and results[3]["error"] == "HTTP_429"
    assert (
        len({(row["case_id"], row["version"], row["repetition"]) for row in results})
        == 120
    )
    assert len((output / "attempts.jsonl").read_text().splitlines()) == 120
    with patch.object(run, "GeminiLLMClient") as client:
        await run.execute(
            output,
            settings,
            cases,
            manifest,
            interval_seconds=0,
            continue_unattempted=True,
        )
        client.return_value.generate.assert_not_called()
    changed = settings.model_copy(update={"gemini_chat_model": "gemini-other"})
    with pytest.raises(ValueError, match="metadata changed"):
        await run.execute(
            output,
            changed,
            cases,
            manifest,
            interval_seconds=0,
            continue_unattempted=True,
        )


@pytest.mark.anyio
async def test_three_transient_failures_stop_with_safe_diagnostics(
    tmp_path: Path,
) -> None:
    """Bound failed calls and retain only safe adapter diagnostic labels."""
    cases, manifest = run.load_cases()
    with patch.object(run, "GeminiLLMClient") as client:
        client.return_value.generate = AsyncMock(
            side_effect=HTTPException(502, "sensitive body")
        )
        with pytest.raises(RuntimeError, match="no automatic retries"):
            await run.execute(
                tmp_path / "transient", Settings(), cases, manifest, interval_seconds=0
            )
        assert client.return_value.generate.call_count == 3
    text = (tmp_path / "transient/results.jsonl").read_text()
    assert "sensitive body" not in text and "provider_or_adapter_error" in text
    assert (
        run.safe_failure_kind(
            HTTPException(502, "Gemini chưa hoàn tất câu trả lời. Hãy thử lại.")
        )
        == "non_stop_finish"
    )
