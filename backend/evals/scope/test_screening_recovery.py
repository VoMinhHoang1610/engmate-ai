"""Offline regressions for language uncertainty and strictly bounded recovery."""

import asyncio
import json
from collections import Counter
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from evals.scope import audit_screening, retry_missing, run
from evals.scope.screening import language_signal


@pytest.fixture
def anyio_backend() -> str:
    """Use asyncio without provider requests."""
    return "asyncio"


@pytest.mark.parametrize(
    ("reply", "expected"),
    [
        ("OK!", "unknown"),
        ("Mate?", "unknown"),
        ("Xin chao ban, minh la Mate. Ban muon hoc tieng Anh khong?", "vi"),
        ('Từ "appointment" nghĩa là cuộc hẹn. Bạn thử đặt câu nhé?', "vi"),
        ('The phrase "xin chào bạn" means hello. Can you greet me?', "en"),
        ("I'm your English teacher. What would you like to practice?", "en"),
        ("```python\nprint('hello')\n```", "unknown"),
        ("'Bạn làm ở đâu?'", "unknown"),
    ],
)
def test_language_handles_short_mixed_and_unaccented_prose(
    reply: str, expected: str
) -> None:
    """Do not use accents alone or force English for ambiguous short replies."""
    assert language_signal(reply)[0] == expected


@pytest.mark.parametrize("word_count", [0, 1, 19, 20, 45, 46])
def test_voice_length_enforces_only_upper_bound(word_count: int) -> None:
    """Ignore legacy minimum metadata; flag voice only above 45 words."""
    case = next(c for c in run.load_cases()[0] if c.id == "revision-regression_v6-002")
    reply = " ".join(["word"] * word_count)
    flags = run.automatic_checks(case, reply, "offline")
    assert flags["voice_length_flag"] == (word_count > 45)
    assert flags["word_count"] == word_count
    assert case.rules.voice_min_words == 20 and case.rules.voice_max_words == 45
    text_case = case.model_copy(update={"mode": "text"})
    assert not run.automatic_checks(text_case, reply, "offline")["voice_length_flag"]


@pytest.mark.anyio
@pytest.mark.parametrize("fail_at", [None, 1, 2])
async def test_recovery_is_one_shot_and_stops_on_first_error(
    tmp_path: Path, fail_at: int | None
) -> None:
    """Isolate the retry loop with a fake validated plan and fake paid calls."""
    output = tmp_path / "recovery"
    replies: list[str | HTTPException] = ["I can help you practice English."] * 4
    if fail_at is not None:
        replies[fail_at - 1] = HTTPException(502, "private upstream body")
    settings = Settings(gemini_api_key=SecretStr("offline-only"))
    with (
        patch.object(retry_missing, "validate_source", return_value=run.load_cases()),
        patch.object(retry_missing, "GeminiLLMClient") as client,
        patch.object(asyncio, "sleep", new_callable=AsyncMock) as delay,
    ):
        client.return_value.generate = AsyncMock(side_effect=replies)
        if fail_at is None:
            await retry_missing.execute(settings, output)
        else:
            with pytest.raises(RuntimeError, match="no more requests"):
                await retry_missing.execute(settings, output)
        count = fail_at or 4
        assert client.return_value.generate.call_count == delay.await_count == count
        assert all(call.args == (10.0,) for call in delay.call_args_list)
        with pytest.raises(FileExistsError):
            await retry_missing.execute(settings, output)
        assert client.return_value.generate.call_count == count
    rows = [
        json.loads(line) for line in (output / "results.jsonl").read_text().splitlines()
    ]
    assert [r["original_attempt"] for r in rows] == [4, 16, 17, 44][:count]
    assert all(r["retry"] == 1 for r in rows)
    text = (output / "results.jsonl").read_text()
    assert "private upstream body" not in text and "offline-only" not in text


def test_recovery_default_cli_never_reads_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep recovery opt-in and outside ordinary test/coverage execution."""
    monkeypatch.setattr("sys.argv", ["retry-missing"])
    with patch.object(retry_missing, "dotenv_values") as credentials:
        retry_missing.main()
    credentials.assert_not_called()


@pytest.mark.anyio
async def test_changed_recovery_configuration_is_rejected_before_call(
    tmp_path: Path,
) -> None:
    """Do not silently retry with a different model or overwrite an experiment."""
    with patch.object(retry_missing, "GeminiLLMClient") as client:
        with pytest.raises(ValueError, match="metadata changed"):
            await retry_missing.execute(
                Settings(gemini_chat_model="gemini-other"), tmp_path / "rejected"
            )
        client.assert_not_called()
    assert not (tmp_path / "rejected").exists()


@pytest.mark.anyio
async def test_historical_recovery_rejects_revised_prompt_and_corpus(
    tmp_path: Path,
) -> None:
    """Never mix the new policy-A revision into the already completed old pilot."""
    with patch.object(retry_missing, "GeminiLLMClient") as client:
        with pytest.raises(ValueError, match="metadata changed"):
            await retry_missing.execute(Settings(), tmp_path / "old-campaign")
        client.assert_not_called()
    assert not (tmp_path / "old-campaign").exists()


def test_offline_audit_preserves_original_results_and_blind_sample(
    tmp_path: Path,
) -> None:
    """Keep the user's ongoing 24-row grading stable during checker corrections."""
    source = audit_screening.SOURCE
    original = {
        path.name: path.read_bytes() for path in source.iterdir() if path.is_file()
    }
    audit_screening.generate(tmp_path / "audit")
    assert original == {
        path.name: path.read_bytes() for path in source.iterdir() if path.is_file()
    }
    rows = [
        json.loads(line)
        for line in (tmp_path / "audit/corrected_checks.jsonl").read_text().splitlines()
    ]
    assert len(rows) == 120
    assert (
        sum(row.get("data_status") == "no_data_neither_pass_nor_fail" for row in rows)
        == 4
    )
    assert all(
        row.get("checks", {}).get("semantic_review", "pending") == "pending"
        for row in rows
    )
    assert Counter(
        (row["version"], row["group"])
        for row in rows
        if row.get("checks", {}).get("voice_length_flag")
    ) == {
        ("persona.v6", "safety"): 3,
        ("persona.v6", "drift"): 1,
        ("persona.v6", "mixed_request"): 1,
        ("persona.v6", "regression_v6"): 1,
    }
    removed = json.loads((tmp_path / "audit/removed_voice_flags.json").read_text())
    assert Counter(item["version"] for item in removed) == {
        "persona.v6": 3,
        "persona.v7": 9,
    }
    assert {item["attempt"] for item in removed} == {
        18,
        19,
        34,
        57,
        59,
        61,
        69,
        73,
        75,
        98,
        99,
        101,
    }
    language = json.loads(
        (tmp_path / "audit/out_of_scope_language.json").read_text(encoding="utf-8")
    )
    assert Counter(item["version"] for item in language) == {
        "persona.v6": 4,
        "persona.v7": 6,
    }
    assert all(
        item["user_language"] == "en" and item["reply_language"] == "vi"
        for item in language
    )
    code_reply = next(item for item in language if item["attempt"] == 46)
    assert code_reply["first_line"] == "```python"
    assert code_reply["reply_contains_code"]
