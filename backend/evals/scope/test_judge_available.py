"""Offline guards for blinded judging, hard limits and non-replaying checkpoints."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from evals.scope import campaign, review_available, run
from evals.scope import judge_available as judge
from evals.scope import language_live as shared


@pytest.fixture
def anyio_backend() -> str:
    """Run fake HTTP only on asyncio."""
    return "asyncio"


@pytest.fixture
def synthetic_generation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Exercise real input guards with invented replies, never private results."""
    source = tmp_path / "generation" / "full"
    source.mkdir(parents=True)
    review = tmp_path / "review"
    review.mkdir()
    cases = campaign.inputs()
    counts = {
        "persona.v7": {
            "out_of_scope": 72,
            "adversarial": 30,
            "safety": 11,
            "identity": 6,
            "checkpoint": 2,
        },
        "persona.v6": {"out_of_scope": 71, "adversarial": 30},
    }
    rows: list[judge.Row] = []
    for version, groups in counts.items():
        for group, count in groups.items():
            selected = [case for case in cases if case.group == group][:count]
            assert len(selected) == count
            for case in selected:
                rows.append(
                    {
                        "slot": len(rows) + 1,
                        "case_id": case.id,
                        "version": version,
                        "repetition": 1,
                        "data_status": "response_available",
                        "reply": "Invented offline fixture reply.",
                    }
                )
    attempts = [
        {key: row[key] for key in ("slot", "case_id", "version", "repetition")}
        | {"attempt": row["slot"], "retry": 0}
        for row in rows
    ]
    for name, records in (("attempts.jsonl", attempts), ("results.jsonl", rows)):
        (source / name).write_bytes(
            ("\n".join(json.dumps(row) for row in records) + "\n").encode("utf-8")
        )
    (source / "metadata.json").write_text(
        json.dumps({"frozen_files": campaign.frozen_files()}), encoding="utf-8"
    )
    (review / "summary.json").write_text(
        json.dumps(
            {
                "source_hashes": {
                    name: judge.digest_file(source / name)
                    for name in ("attempts.jsonl", "results.jsonl")
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(campaign, "OUTPUT", source.parent)
    monkeypatch.setattr(review_available, "OUTPUT", review)
    monkeypatch.setattr(judge, "OUTPUT", tmp_path / "judge")
    return source


def verdict(review_id: str = "J0001") -> dict[str, object]:
    """Produce a valid compact fixture covering every rubric criterion."""
    return {
        "review_id": review_id,
        "criteria": {
            key: {"grade": "pass", "reason": "Đúng tiêu chí", "evidence": ""}
            for key in judge.CRITERIA
        },
        "overall": "pass",
    }


def test_frozen_plan_blinds_source_and_offline_cli(synthetic_generation: Path) -> None:
    """Renewed old scope cannot expand to other groups or call credentials offline."""
    rows, lock = judge.inputs()
    assert len(rows) == 222
    assert lock["request_budget"] == 444 < lock["historical_judge_request_cap"]
    assert {row["group"] for row in rows} == judge.GROUPS
    value = json.loads(judge.payload(rows[0]))
    assert (
        not {"version", "checks", "case_id", "repetition", "all_checks"} & value.keys()
    )
    assert value["lesson"] is None or "checks" not in value["lesson"]
    with (
        patch("sys.argv", ["judge_available"]),
        patch.object(judge, "dotenv_values") as credentials,
    ):
        judge.main()
    credentials.assert_not_called()


@pytest.mark.parametrize("changed", ["attempts.jsonl", "results.jsonl", "metadata"])
def test_inputs_reject_tampered_synthetic_sources(
    synthetic_generation: Path, changed: str
) -> None:
    """Keep byte/provenance checks active without reading any saved response."""
    source = synthetic_generation
    judge.inputs()
    if changed == "metadata":
        path = source / "metadata.json"
        metadata = json.loads(path.read_text(encoding="utf-8"))
        frozen = metadata["frozen_files"]
        frozen[next(iter(frozen))] = "0" * 64
        path.write_text(json.dumps(metadata), encoding="utf-8")
        message = "Frozen generation inputs changed"
    else:
        path = source / changed
        path.write_bytes(path.read_bytes() + b"\n")
        message = "Generation ledger/results changed"
    with (
        patch.object(judge, "dotenv_values") as credentials,
        patch.object(judge, "GeminiLLMClient") as client,
    ):
        with pytest.raises(ValueError, match=message):
            judge.inputs()
        credentials.assert_not_called()
        client.assert_not_called()


def test_invalid_verdicts_and_invented_evidence_are_not_grades() -> None:
    """No semantic acceptance from malformed or inconsistent judge output."""
    row = {"review_id": "J0001", "reply": "Synthetic reply."}
    assert judge.parse_judgment(json.dumps(verdict()), row)["overall"] == "pass"
    wrong = verdict("wrong-id")
    with pytest.raises(ValueError):
        judge.parse_judgment(json.dumps(wrong), row)
    wrong = verdict()
    wrong["overall"] = "fail"
    with pytest.raises(ValueError):
        judge.parse_judgment(json.dumps(wrong), row)
    raw = json.dumps(verdict()).replace('"evidence": ""', '"evidence": "invented"', 1)
    with pytest.raises(ValueError):
        judge.parse_judgment(raw, row)
    with pytest.raises(ValueError):
        judge.parse_judgment("{}", row)


def test_json_fence_changes_only_transport_format() -> None:
    """Accept one JSON fence while preserving every rubric/evidence check."""
    row = {"review_id": "J0001", "reply": "Synthetic reply."}
    text = json.dumps(verdict())
    assert judge.parse_judgment(
        "```json\n" + text + "\n```", row
    ) == judge.parse_judgment(text, row)
    with pytest.raises(ValueError):
        judge.parse_judgment("```json\n{}\n```", row)


def test_continuation_excludes_attempted_slots_and_refuses_429(tmp_path: Path) -> None:
    """Keep the old ledger immutable and keep the combined budget below its ceiling."""
    slots = [{"review_id": "J0001"}, {"review_id": "J0002"}]
    lock: judge.Row = {
        "runner_sha256": "new-runner",
        "rubric_sha256": "rubric",
        "request_budget": 4,
        "main_slots": 2,
        "slots": slots,
    }
    parent_lock = {**lock, "runner_sha256": "original-runner"}
    attempt = {
        "attempt": 1,
        "review_id": "J0001",
        "retry": 0,
        "model": judge.MODEL,
        "rubric_sha256": "rubric",
        "input_sha256": run.digest("synthetic data"),
    }
    result = {
        **attempt,
        "terminal": True,
        "error": "invalid_judgment_or_transport",
        "failure_kind": "invalid_judgment",
    }
    (tmp_path / "LOCK.json").write_text(json.dumps(parent_lock), encoding="utf-8")
    shared.append(tmp_path / "attempts.jsonl", attempt)
    shared.append(tmp_path / "results.jsonl", result)
    original = (tmp_path / "results.jsonl").read_bytes()
    with (
        patch.object(judge, "inputs", return_value=(slots, lock)),
        patch.object(judge, "digest_file", return_value="original-runner"),
        patch.object(judge, "payload", return_value="synthetic data"),
    ):
        remaining, plan = judge.build_plan(tmp_path)
        assert remaining == [slots[1]]
        assert plan["combined_request_ceiling"] == 3 < lock["request_budget"]
        assert (tmp_path / "results.jsonl").read_bytes() == original
        result["error"] = "HTTP_429"
        (tmp_path / "results.jsonl").write_text(
            json.dumps(result) + "\n", encoding="utf-8"
        )
        with pytest.raises(ValueError, match="429"):
            judge.build_plan(tmp_path)


@pytest.mark.anyio
@pytest.mark.parametrize(
    "statuses, expected_calls, stop",
    [
        ([429], 1, "http_429_stopped_waiting_for_user"),
        ([502, 200], 2, "completed"),
        ([502, 502], 2, "completed"),
        ([403], 1, "configuration_or_invalid_judgment_stopped_for_review"),
    ],
)
async def test_stops_retries_and_resume_without_replay(
    tmp_path: Path,
    statuses: list[int],
    expected_calls: int,
    stop: str,
) -> None:
    """Keep the original timeout, delay/backoff and one retry; use fake HTTP."""
    slots = [
        {
            "review_id": "J0001",
            "slot": 1,
            "case_id": "fake",
            "version": "persona.v7",
            "group": "out_of_scope",
            "repetition": 1,
            "reply": "Synthetic reply.",
        }
    ]
    lock = {"request_budget": 2, "rubric_sha256": "offline-rubric"}
    requests = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        status = statuses[len(requests) - 1]
        if status != 200:
            return httpx.Response(
                status, headers={"Retry-After": "13"}, text="not-for-export"
            )
        event = {
            "candidates": [
                {
                    "content": {"parts": [{"text": json.dumps(verdict())}]},
                    "finishReason": "STOP",
                }
            ]
        }
        return httpx.Response(200, text="data: " + json.dumps(event) + "\n\n")

    settings = Settings(
        gemini_api_key=SecretStr("offline-only"), gemini_chat_model=judge.MODEL
    )
    transport = httpx.MockTransport(respond)
    output = tmp_path / "judge"
    with (
        patch.object(judge, "inputs", return_value=(slots, lock)),
        patch.object(judge, "payload", return_value="synthetic data"),
        patch(
            "evals.scope.judge_available.asyncio.sleep", new_callable=AsyncMock
        ) as sleep,
    ):
        summary = await judge.execute(settings, output, transport=transport)
        assert summary["stop_reason"] == stop
        assert len(requests) == summary["judge_requests"] == expected_calls
        assert sleep.await_args_list[0].args[0] == 6
        if expected_calls == 2:
            assert sleep.await_args_list[1].args[0] > 12
        if statuses[0] != 429:
            await judge.execute(settings, output, resume=True, transport=transport)
            assert len(requests) == expected_calls
        attempts = shared.read_rows(output / "attempts.jsonl")
        results = shared.read_rows(output / "results.jsonl")
        judge.validate_ledger(attempts, results, slots, lock)
        with pytest.raises(ValueError, match="Unresolved"):
            judge.validate_ledger(attempts, [], slots, lock)
        changed = [{**row, "input_sha256": "changed"} for row in attempts]
        with pytest.raises(ValueError, match="identity"):
            judge.validate_ledger(changed, results, slots, lock)
    exported = "".join(p.read_text(encoding="utf-8-sig") for p in output.iterdir())
    assert "offline-only" not in exported and "not-for-export" not in exported


def test_final_continuation_preserves_both_parents_and_combined_cap(
    tmp_path: Path,
) -> None:
    """Keep prior grades/invalids and skip every previously attempted review ID."""
    initial = tmp_path / "initial"
    initial.mkdir()
    previous = tmp_path / "initial-remaining"
    previous.mkdir()
    slots = [{"review_id": f"J000{i}"} for i in range(1, 4)]
    lock: judge.Row = {
        "runner_sha256": "new-runner",
        "rubric_sha256": "rubric",
        "request_budget": 6,
        "main_slots": 3,
        "slots": slots,
    }

    def attempt(review_id: str) -> judge.Row:
        return {
            "attempt": 1,
            "review_id": review_id,
            "retry": 0,
            "model": judge.MODEL,
            "rubric_sha256": "rubric",
            "input_sha256": run.digest("synthetic data"),
        }

    first = attempt("J0001")
    (initial / "LOCK.json").write_text(
        json.dumps({**lock, "runner_sha256": "original-runner"}), encoding="utf-8"
    )
    shared.append(initial / "attempts.jsonl", first)
    shared.append(
        initial / "results.jsonl",
        {
            **first,
            "terminal": True,
            "error": "invalid_judgment_or_transport",
            "failure_kind": "invalid_judgment",
        },
    )
    with (
        patch.object(judge, "OUTPUT", initial),
        patch.object(judge, "inputs", return_value=(slots, lock)),
        patch.object(judge, "digest_file", return_value="original-runner"),
        patch.object(judge, "payload", return_value="synthetic data"),
    ):
        _, parent_plan = judge.build_plan(initial)
        (previous / "LOCK.json").write_text(
            json.dumps({**parent_plan, "runner_sha256": "original-runner"}),
            encoding="utf-8",
        )
        second = attempt("J0002")
        shared.append(previous / "attempts.jsonl", second)
        result = {**second, "terminal": True, "judgment": verdict("J0002")}
        shared.append(previous / "results.jsonl", result)
        original = (previous / "results.jsonl").read_bytes()
        remaining, plan = judge.build_plan(previous)
        assert remaining == [slots[2]]
        assert plan["prior_judge_requests"] == 2
        assert plan["combined_request_ceiling"] == 4
        assert (previous / "results.jsonl").read_bytes() == original
        result = {**second, "terminal": True, "error": "HTTP_429"}
        (previous / "results.jsonl").write_text(
            json.dumps(result) + "\n", encoding="utf-8"
        )
        with pytest.raises(ValueError, match="429"):
            judge.build_plan(previous)
