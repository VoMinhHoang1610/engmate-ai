"""Opt-in final generation only: 1,050 fixed slots, no pilot or LLM-judge."""

import argparse
import asyncio
import csv
import hashlib
import json
import math
import os
import random
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
from dotenv import dotenv_values
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.llm.gemini import GeminiLLMClient
from evals.scope import language_live as shared
from evals.scope import run

DATE = "2026-11-13"
PROMPT_SHA256 = "e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680"
CORPUS_SHA256 = "506b2c9b1a9807e5218b594d53002f9f7d3f182a34e8ae9002fc8ab99fe6bd4c"
OUTPUT = run.ROOT / "results/final-default-vi-20261113"
# Checkpoint/result maps contain heterogeneous JSON and existing checker maps.
Row = dict[str, Any]
Slot = tuple[run.Case, str, int]


def inputs() -> list[run.Case]:
    """Require the exact approved inputs, including the immutable v6 baseline."""
    run.load_cases()
    for path, expected in (
        (run.PROMPTS / "persona.v7.txt", PROMPT_SHA256),
        (run.PROMPTS / "persona.v6.txt", run.V6_SHA256),
        (run.ROOT / "cases.jsonl", CORPUS_SHA256),
    ):
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError("Frozen campaign input changed; no calls permitted.")
    return [
        run.Case.model_validate_json(line)
        for line in (run.ROOT / "cases.jsonl").read_text(encoding="utf-8").splitlines()
    ]


def plan(stage: str) -> list[Slot]:
    """Expose only full generation; the user explicitly forbids another pilot."""
    cases = inputs()
    if stage != "full":
        raise ValueError("Unsupported stage; judges are not implemented.")
    result = [
        (c, version, rep)
        for rep in range(1, 4)
        for version in ("persona.v7", "persona.v6")
        for c in cases
        if version == "persona.v7" or c.group in ("out_of_scope", "adversarial")
    ]
    if len(result) != 1050:
        raise ValueError("Generation authorization changed.")
    return result


def frozen_files() -> dict[str, str]:
    """Freeze all prompt-composition inputs and checker/transport sources too."""
    paths = [
        *run.PROMPTS.glob("*.txt"),
        run.ROOT / "cases.jsonl",
        run.ROOT / "manifest.json",
        run.ROOT / "screening.py",
        run.ROOT / "run.py",
        Path(__file__),
        run.REPO_ROOT / "backend/app/content/toeic.v1.json",
        run.REPO_ROOT / "backend/app/llm/gemini.py",
    ]
    return {
        str(p.relative_to(run.REPO_ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in paths
    }


def restore(output: Path, metadata: Row, slots: list[Slot]) -> list[Row]:
    """Reject tampered ledgers and never replay requests with missing results."""
    attempts = shared.read_rows(output / "attempts.jsonl")
    results = shared.read_rows(output / "results.jsonl")
    known = {r["attempt"]: r for r in results}
    if len(attempts) > metadata["request_budget"] or len(known) != len(results):
        raise ValueError("Invalid ledger budget or duplicate results.")
    histories: dict[int, list[Row]] = defaultdict(list)
    for index, attempt in enumerate(attempts, 1):
        slot = attempt["slot"]
        if not 1 <= slot <= len(slots) or attempt["attempt"] != index:
            raise ValueError("Invalid ledger sequence.")
        case, version, repetition = slots[slot - 1]
        previous = histories[slot]
        if (
            attempt["case_id"],
            attempt["version"],
            attempt["repetition"],
            attempt["retry"],
        ) != (case.id, version, repetition, len(previous)):
            raise ValueError("Ledger differs from frozen plan.")
        if len(previous) >= 2 or (
            previous
            and (
                known[previous[-1]["attempt"]].get("terminal", True)
                or known[previous[-1]["attempt"]].get("error") != "HTTP_502"
            )
        ):
            raise ValueError("Only one recorded 502 retry is allowed.")
        if any(
            attempt.get(k) != metadata[k]
            for k in ("date", "model", "campaign_prompt_sha256", "corpus_sha256")
        ):
            raise ValueError("Ledger provenance changed.")
        expected_sha = metadata["version_prompt_sha256"][version]
        if attempt["prompt_sha256"] != expected_sha:
            raise ValueError("Version prompt hash changed.")
        row = known.get(index)
        if row is None:
            row = {
                **attempt,
                "error": "interrupted_unconfirmed",
                "terminal": True,
                "data_status": "no_data",
                "completed_at": shared.now().isoformat(),
            }
            shared.append(output / "results.jsonl", row)
            results.append(row)
            known[index] = row
        if any(row.get(k) != v for k, v in attempt.items()) or (
            ("reply" in row) == ("error" in row)
        ):
            raise ValueError("Result identity or payload invalid.")
        previous.append(attempt)
    if set(known) - {r["attempt"] for r in attempts}:
        raise ValueError("Result without a corresponding request.")
    return results


def classify(row: Row) -> str:
    """Label mechanical screening only; leave semantic grades blank."""
    if row.get("data_status") != "response_available":
        return "no_data" if row else "not_run"
    checks = row["checks"]
    if any(bool(v) for k, v in checks.items() if k.endswith("_flag")):
        return "flagged"
    return "uncertain" if checks["language_review_required"] else "screen_clear"


def export(output: Path, metadata: Row, slots: list[Slot], stop: str) -> Row:
    """Export all responses, group screens and reproducible stratified hand sheets."""
    latest = {r["slot"]: r for r in shared.read_rows(output / "results.jsonl")}
    review: list[Row] = []
    groups: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    cases: dict[tuple[str, str, str], list[Row]] = defaultdict(list)
    for slot, (case, version, repetition) in enumerate(slots, 1):
        row = latest.get(slot, {})
        checks = row.get("checks", {})
        status = classify(row) if row.get("terminal", False) else "not_run"
        item = {
            "date": metadata["date"],
            "model": metadata["model"],
            "prompt_sha256": metadata["version_prompt_sha256"][version],
            "campaign_prompt_sha256": PROMPT_SHA256,
            "corpus_sha256": CORPUS_SHA256,
            "slot": slot,
            "case_id": case.id,
            "group": case.group,
            "version": version,
            "repetition": repetition,
            "level": case.level,
            "mode": case.mode,
            "user_message": case.user_message,
            "history": json.dumps(case.history, ensure_ascii=False),
            "phase": case.phase,
            "lesson_id": case.lesson_id,
            "expected_behavior": case.expected,
            "must": json.dumps(case.must, ensure_ascii=False),
            "must_not": json.dumps(case.must_not, ensure_ascii=False),
            "expected_language": checks.get("expected_language", case.rules.language),
            "language_hint": checks.get("language_hint", ""),
            "language_review_required": checks.get("language_review_required", ""),
            "refusal_mixed_language_flag": checks.get(
                "refusal_mixed_language_flag", ""
            ),
            "voice_length_flag": checks.get("voice_length_flag", ""),
            "word_count": checks.get("word_count", ""),
            "all_checks": json.dumps(checks, ensure_ascii=False),
            "screen_status": status,
            "data_status": row.get("data_status", "not_run"),
            "reply": row.get("reply", ""),
            "error": row.get("error", ""),
            "human_language": "",
            "human_mixed_refusal": "",
            "human_semantic_grade": "",
            "notes": "",
        }
        review.append(item)
        groups[(version, case.group)][status] += 1
        counts = groups[(version, case.group)]
        counts["planned_runs"] += 1
        if row.get("data_status") == "response_available":
            counts["responses"] += 1
            counts["language_matches"] += checks.get("language_hint") == checks.get(
                "expected_language"
            )
            counts["language_mismatches"] += bool(checks.get("language_flag"))
            counts["language_uncertain"] += bool(checks.get("language_review_required"))
            counts["voice_over_45"] += bool(checks.get("voice_length_flag"))
            counts["mixed_refusal_flags"] += bool(
                checks.get("refusal_mixed_language_flag")
            )
        cases[(version, case.group, case.id)].append(item)
    summary = {
        **metadata,
        "stop_reason": stop,
        "calls_used": len(shared.read_rows(output / "attempts.jsonl")),
        "by_group": [
            {"version": v, "group": g, **dict(count)}
            for (v, g), count in groups.items()
        ],
    }
    (output / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    def csv_file(name: str, items: list[Row]) -> None:
        with (output / name).open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(items[0]))
            writer.writeheader()
            writer.writerows(
                {k: run.csv_cell(v) for k, v in item.items()} for item in items
            )

    csv_file("review.csv", review)
    rng = random.Random(20261113)
    selected: dict[tuple[str, str, str], str] = {}
    strata: dict[tuple[str, str], list[tuple[str, str, str]]] = defaultdict(list)
    for key, items in cases.items():
        strata[key[:2]].append(key)
        if any(
            r["screen_status"] in ("flagged", "uncertain", "no_data") for r in items
        ):
            selected[key] = "all_flagged_uncertain_or_missing_case"
    sampling = []
    for (version, group), keys in strata.items():
        remaining = sorted(k for k in keys if k not in selected)
        count = min(len(remaining), math.ceil(len(keys) * 0.2))
        for key in rng.sample(remaining, count):
            selected[key] = "seeded_random_20_percent_of_group"
        sampling.append(
            {
                "version": version,
                "group": group,
                "case_count": len(keys),
                "random_additional_cases": count,
                "selected_cases": sum(k in selected for k in keys),
            }
        )
    manual = [
        {**r, "selection_reason": selected[key]}
        for key, items in cases.items()
        if key in selected
        for r in items
    ]
    csv_file("manual_sample.csv", manual)
    (output / "manual_sampling.json").write_text(
        json.dumps(
            {
                **metadata,
                "seed": 20261113,
                "sampling_unit": "case_id_all_three_runs",
                "rule": "all flagged/uncertain/missing cases "
                "plus ceil(20% cases) per stratum",
                "judge_calls": 0,
                "strata": sampling,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    lines = [
        "# Screening — final default-Vietnamese refusal policy",
        "",
        f"Date: {metadata['date']}; model: `{metadata['model']}`.",
        f"SHA-256 v7: `{PROMPT_SHA256}`; corpus: `{CORPUS_SHA256}`.",
        f"Stage: {metadata['stage']}; stop: {stop}; calls: {summary['calls_used']}/"
        f"{metadata['request_budget']}.",
        "",
        "Mechanical screening only. No LLM-judge; "
        "semantic grades pending human review.",
        "Voice flags only above 45 words. English examples/practice are allowed. "
        "Mixing flags concern refusal clauses or duplicated bilingual refusals only.",
        "",
        "| Version | Group | Clear screen | Flagged | Uncertain | No data | Not run |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for (version, group), group_counts in groups.items():
        lines.append(
            f"| {version} | {group} | {group_counts['screen_clear']} "
            f"| {group_counts['flagged']} | {group_counts['uncertain']} "
            f"| {group_counts['no_data']} | {group_counts['not_run']} |"
        )
    if metadata["stage"] == "full":
        lines += [
            "",
            "| Slot | ID | Repeat | Expected | Observed | Mixed "
            "| Voice >45 | First line |",
            "|---:|---|---:|---|---|---|---|---|",
        ]
        for r in review:
            first = r["reply"].splitlines()[0] if r["reply"] else "[no data]"
            first = first.replace("&", "&amp;").replace("|", "&#124;")
            first = first.replace("<", "&lt;").replace(">", "&gt;")
            lines.append(
                f"| {r['slot']} | {r['case_id']} | {r['repetition']} "
                f"| {r['expected_language']} | {r['language_hint']} "
                f"| {r['refusal_mixed_language_flag']} | {r['voice_length_flag']} "
                f"| {first} |"
            )
    lines += [
        "",
        "Full replies: review.csv. Stratified hand sheet: manual_sample.csv.",
        "Missing data are neither pass nor fail. "
        "No acceptance conclusion before hand grading.",
    ]
    (output / "SCREENING.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return summary


async def execute(
    settings: Settings,
    stage: str,
    output: Path,
    *,
    resume: bool = False,
    interval: float = 6.0,
    transport: httpx.AsyncBaseTransport | None = None,
) -> Row:
    """Use one sequential ledger engine for both stages; stop immediately on 429."""
    slots = plan(stage)
    metadata: Row = {
        "date": DATE,
        "model": settings.gemini_chat_model,
        "prompt_sha256": PROMPT_SHA256,
        "campaign_prompt_sha256": PROMPT_SHA256,
        "corpus_sha256": CORPUS_SHA256,
        "stage": stage,
        "slot_budget": len(slots),
        "request_budget": len(slots) * 2,
        "max_502_retries_per_slot": 1,
        "interval_seconds": interval,
        "max_output_tokens": settings.gemini_max_output_tokens,
        "temperature": "provider_default",
        "judge_calls": 0,
        "blaze_calls": 0,
        "version_prompt_sha256": {
            "persona.v7": PROMPT_SHA256,
            "persona.v6": run.V6_SHA256,
        },
        "frozen_files": frozen_files(),
        "language_policy": "final_default_vi_explicit_english_override",
        "pilot_calls": 0,
    }
    if resume:
        saved = json.loads((output / "metadata.json").read_text(encoding="utf-8"))
        if any(saved.get(k) != v for k, v in metadata.items()):
            raise ValueError("Resume metadata changed.")
        metadata = saved
    else:
        output.mkdir(parents=True, exist_ok=False)
        metadata["started_at"] = shared.now().isoformat()
        (output / "metadata.json").write_text(
            json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
        )
    rows = restore(output, metadata, slots)
    calls = len(shared.read_rows(output / "attempts.jsonl"))
    provider_status: int | None = None
    retry_after = 0.0

    async def response_hook(response: httpx.Response) -> None:
        nonlocal provider_status, retry_after
        provider_status = response.status_code
        retry_after = shared.retry_after_seconds(response.headers.get("Retry-After"))

    stop = "interrupted_or_guard_failure"
    secret = (
        settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else ""
    )
    try:
        async with httpx.AsyncClient(
            trust_env=False,
            follow_redirects=False,
            timeout=httpx.Timeout(30, connect=10),
            event_hooks={"response": [response_hook]},
            transport=transport,
        ) as http_client:
            client = GeminiLLMClient(settings, http_client=http_client)
            for slot, (case, version, repetition) in enumerate(slots, 1):
                history = [r for r in rows if r["slot"] == slot]
                if history and history[-1]["terminal"]:
                    continue
                for retry in range(1 if history else 0, 2):
                    if frozen_files() != metadata["frozen_files"]:
                        raise ValueError("Frozen files changed during campaign.")
                    wait = interval
                    if rows and rows[-1].get("not_before"):
                        wait = max(
                            wait,
                            (
                                datetime.fromisoformat(rows[-1]["not_before"])
                                - shared.now()
                            ).total_seconds(),
                        )
                    await asyncio.sleep(max(0.0, wait))
                    if frozen_files() != metadata["frozen_files"]:
                        raise ValueError("Frozen files changed while waiting.")
                    if calls >= metadata["request_budget"]:
                        raise RuntimeError("Hard request ceiling reached.")
                    calls += 1
                    provider_status, retry_after = None, 0.0
                    attempt = {
                        "date": DATE,
                        "model": metadata["model"],
                        "prompt_sha256": metadata["version_prompt_sha256"][version],
                        "campaign_prompt_sha256": PROMPT_SHA256,
                        "corpus_sha256": CORPUS_SHA256,
                        "slot": slot,
                        "case_id": case.id,
                        "version": version,
                        "repetition": repetition,
                        "retry": retry,
                        "attempt": calls,
                        "at": shared.now().isoformat(),
                    }
                    shared.append(output / "attempts.jsonl", attempt)
                    row = dict(attempt)
                    try:
                        prompt = run.compose_prompt(case, version)
                        reply = await client.generate(
                            case.user_message, case.level, prompt, case.history
                        )
                        row.update(
                            reply=run.redact(reply, [secret]),
                            checks=run.automatic_checks(case, reply, prompt),
                            data_status="response_available",
                            terminal=True,
                        )
                    except (HTTPException, httpx.HTTPError) as error:
                        status = (
                            error.status_code
                            if isinstance(error, HTTPException)
                            else None
                        )
                        retryable = status == 502 and provider_status in (None, 502)
                        row.update(
                            error=f"HTTP_{status}" if status else type(error).__name__,
                            failure_kind=run.safe_failure_kind(error),
                            provider_http_status=provider_status,
                            data_status="no_data",
                            terminal=not (retryable and retry == 0),
                        )
                    if (
                        retry_after
                        or not row["terminal"]
                        or row.get("error") == "HTTP_429"
                    ):
                        delay = max(
                            retry_after, 10.0 if not row["terminal"] else interval
                        )
                        row["not_before"] = (
                            shared.now() + timedelta(seconds=delay)
                        ).isoformat()
                    row["completed_at"] = shared.now().isoformat()
                    shared.append(output / "results.jsonl", row)
                    rows.append(row)
                    print(
                        f"{stage}: slot {slot}/{len(slots)}, request {calls}/"
                        f"{metadata['request_budget']}, retry {retry}: "
                        f"{row['data_status']}",
                        flush=True,
                    )
                    if row.get("error") == "HTTP_429":
                        stop = "http_429_stopped_waiting_for_user"
                        return export(output, metadata, slots, stop)
                    if row["terminal"]:
                        break
            stop = "completed"
    finally:
        summary = export(output, metadata, slots, stop)
    return summary


async def campaign(settings: Settings, *, resume: bool = False) -> None:
    """Freeze the final prompt, run generation directly, and stop without a judge."""
    inputs()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    lock = OUTPUT / "PROMPT_LOCK.json"
    lock_data = {
        "date": DATE,
        "model": settings.gemini_chat_model,
        "prompt_sha256": PROMPT_SHA256,
        "corpus_sha256": CORPUS_SHA256,
        "full_slots": 1050,
        "full_request_budget": 2100,
        "pilot_calls": 0,
        "judge_calls": 0,
        "authorization": "user_final_policy_direct_full_generation",
    }
    if lock.exists():
        if not resume or json.loads(lock.read_text(encoding="utf-8")) != lock_data:
            raise ValueError(
                "Prompt lock already exists or changed; no calls permitted."
            )
    else:
        lock.write_text(
            json.dumps(lock_data, indent=2) + "\n",
            encoding="utf-8",
        )
    await execute(
        settings, "full", OUTPUT / "full", resume=resume and (OUTPUT / "full").exists()
    )


def main() -> None:
    """Default offline; no judge flag or arbitrary case/budget override."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    inputs()
    if not args.execute:
        print("Offline: full generation 1050 slots/2100 requests; pilot=0; judge=0.")
        return
    config = dotenv_values(run.REPO_ROOT / ".env")
    key = os.getenv("GEMINI_API_KEY") or config.get("GEMINI_API_KEY")
    if not key:
        raise ValueError("Gemini credentials not configured.")
    settings = Settings(
        gemini_api_key=SecretStr(key),
        gemini_chat_model=os.getenv("GEMINI_CHAT_MODEL")
        or config.get("GEMINI_CHAT_MODEL")
        or "gemini-3.5-flash-lite",
        gemini_max_output_tokens=int(
            os.getenv("GEMINI_MAX_OUTPUT_TOKENS")
            or config.get("GEMINI_MAX_OUTPUT_TOKENS")
            or "2048"
        ),
    )
    try:
        asyncio.run(campaign(settings, resume=args.resume))
    except Exception as error:
        print(f"Stopped safely: {type(error).__name__}; inspect local artifacts.")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
