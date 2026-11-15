"""Opt-in step-one pilot only: six fixed cases, three runs, at most 36 calls."""

import argparse
import asyncio
import csv
import json
import math
import os
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

import httpx
from dotenv import dotenv_values
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.llm.gemini import GeminiLLMClient
from evals.scope import run

DATE = "2026-11-13"
PROMPT_SHA256 = "d7496d666745c9e04c47a321a1ca25a15f43d514302b8afcd717c26bd92772fc"
CORPUS_SHA256 = "1316aa4e3e74ddaa1206e15e92ca9de53cd34db4c8c6f5c6078279c2ea69ebfc"
OUTPUT = run.ROOT / "results/language-repair-20261113"
# Artifact rows are heterogeneous JSON, including the existing checker result map.
Row = dict[str, Any]


def now() -> datetime:
    """Use the campaign's local timezone for timestamps."""
    return datetime.now(run.LOCAL_ZONE)


def inputs() -> list[run.Case]:
    """Reject changed inputs; this entry point cannot select the full corpus."""
    run.load_cases()
    if (
        run.digest((run.PROMPTS / "persona.v7.txt").read_text(encoding="utf-8"))
        != PROMPT_SHA256
        or run.digest((run.ROOT / "cases.jsonl").read_text(encoding="utf-8"))
        != CORPUS_SHA256
    ):
        raise ValueError("Authorized prompt/corpus changed; no calls allowed.")
    cases = [
        run.Case.model_validate_json(line)
        for line in (run.ROOT / "cases.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    selected = [case for case in cases if "language_policy_a_20261113" in case.tags]
    expected = [
        f"refusal-language-{level}-{mode}"
        for level in ("A1", "B1", "C1")
        for mode in ("text", "voice")
    ]
    if [case.id for case in selected] != expected:
        raise ValueError("Exactly the six authorized language cases are required.")
    return selected


def retry_after_seconds(value: str | None) -> float:
    """Parse seconds or HTTP-date without retaining any untrusted header text."""
    if value is None:
        return 0.0
    try:
        seconds = float(value)
        return max(0.0, seconds) if math.isfinite(seconds) else 0.0
    except ValueError:
        try:
            timestamp = parsedate_to_datetime(value)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=UTC)
            return max(0.0, (timestamp - now()).total_seconds())
        except (ValueError, TypeError, OverflowError):
            return 0.0


def append(path: Path, row: Row) -> None:
    """Flush and sync each attempt/result immediately, before proceeding."""
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def read_rows(path: Path) -> list[Row]:
    """Read only complete checkpoint files; reject malformed/truncated JSON."""
    return (
        [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
        if path.exists()
        else []
    )


def language_decision(review: list[Row]) -> Row:
    """Apply the user's precommitted 15/18 rule; mixed/unknown earn no credit."""
    available = [row for row in review if row["data_status"] == "response_available"]
    english = sum(row["language_hint"] == "en" for row in available)
    complete = len(review) == 18 and all(
        row["data_status"] in ("response_available", "no_data") for row in review
    )
    return {
        "english": english,
        "denominator": 18,
        "required_english": 15,
        "outcome": (
            ("keep_A" if english >= 15 else "propose_B_not_applied")
            if complete
            else "incomplete_stop_waiting_for_user"
        ),
    }


def first_lines(review: list[Row]) -> list[str]:
    """Show the first physical line, preserving wording without Markdown injection."""

    def cell(value: object) -> str:
        return (
            str(value)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("|", "&#124;")
            .replace("`", "&#96;")
        )

    def line(row: Row) -> str:
        reply = str(row.get("reply", ""))
        return cell(reply.splitlines()[0] if reply else "[chưa có dữ liệu]")

    lines = [
        "",
        "## Dòng đầu của 18 phản hồi",
        "",
        "Giữ nguyên dòng vật lý đầu tiên; không rút thành câu đầu. "
        "Unknown/trộn không được tính là tiếng Anh.",
        "",
        "| Slot | ID | Lần | Ngôn ngữ screening | Dòng đầu |",
        "|---:|---|---:|---|---|",
    ]
    for row in sorted(review, key=lambda item: item["slot"]):
        lines.append(
            f"| {row['slot']} | {cell(row['case_id'])} | {row['repetition']} "
            f"| {cell(row.get('language_hint', ''))} | {line(row)} |"
        )
    uncertain = [row for row in review if row.get("language_review_required")]
    lines += ["", f"## Chưa rõ / trộn: {len(uncertain)} lượt", ""]
    for row in sorted(uncertain, key=lambda item: item["slot"]):
        lines.append(
            f"- Slot {row['slot']}, {cell(row['case_id'])}, "
            f"lần {row['repetition']}: {line(row)}"
        )
    if not uncertain:
        lines.append("Không có lượt chưa rõ/trộn theo checker hiện tại.")
    return lines


def restore(output: Path, metadata: Row, plan: list[tuple[run.Case, int]]) -> list[Row]:
    """Validate the ledger; unresolved calls become missing and are not replayed."""
    attempts = read_rows(output / "attempts.jsonl")
    results = read_rows(output / "results.jsonl")
    if len(attempts) > 36:
        raise ValueError("Request ceiling exceeded in saved ledger.")
    known = {row["attempt"]: row for row in results}
    if len(known) != len(results):
        raise ValueError("Duplicate terminal attempt records.")
    slots: dict[int, list[Row]] = {}
    for index, attempt in enumerate(attempts, 1):
        slot = attempt["slot"]
        if not 1 <= slot <= 18 or attempt["attempt"] != index:
            raise ValueError("Invalid attempt sequence.")
        case, repetition = plan[slot - 1]
        previous = slots.get(slot, [])
        if (
            attempt["case_id"] != case.id
            or attempt["repetition"] != repetition
            or attempt["retry"] != len(previous)
            or len(previous) >= 2
            or any(
                attempt[key] != metadata[key]
                for key in ("date", "model", "prompt_sha256")
            )
        ):
            raise ValueError("Ledger does not match the frozen plan/metadata.")
        if previous:
            prior = known.get(previous[-1]["attempt"], {})
            if prior.get("error") != "HTTP_502" or prior.get("terminal", True):
                raise ValueError("Only one retry of a recorded HTTP 502 is allowed.")
        result = known.get(index)
        if result is None:
            result = {
                **attempt,
                "error": "interrupted_unconfirmed",
                "data_status": "no_data",
                "terminal": True,
                "completed_at": now().isoformat(),
            }
            append(output / "results.jsonl", result)
            results.append(result)
            known[index] = result
        if any(result.get(key) != value for key, value in attempt.items()):
            raise ValueError("Result identity differs from its ledger entry.")
        if ("reply" in result) == ("error" in result):
            raise ValueError("Each attempt must have exactly one reply or safe error.")
        slots.setdefault(slot, []).append(attempt)
    if any(index not in {row["attempt"] for row in attempts} for index in known):
        raise ValueError("Result without a corresponding request ledger.")
    return results


def export(
    output: Path, metadata: Row, cases: list[run.Case], stop_reason: str
) -> None:
    """Write form-only summaries and all 18 rows for human review, with provenance."""
    results = read_rows(output / "results.jsonl")
    latest = {row["slot"]: row for row in results}
    review = []
    summary = []
    for case_index, case in enumerate(cases):
        rows = []
        for repetition in range(1, 4):
            slot = (repetition - 1) * 6 + case_index + 1
            row = latest.get(slot, {})
            checks = row.get("checks", {})
            status = (
                "pending_retry"
                if row and not row.get("terminal", False)
                else row.get("data_status", "not_run")
            )
            item = {
                "date": metadata["date"],
                "model": metadata["model"],
                "prompt_sha256": metadata["prompt_sha256"],
                "slot": slot,
                "case_id": case.id,
                "repetition": repetition,
                "level": case.level,
                "mode": case.mode,
                "expected_language": case.rules.language,
                "language_hint": checks.get("language_hint", ""),
                "language_flag": checks.get("language_flag", ""),
                "language_review_required": checks.get("language_review_required", ""),
                "word_count": checks.get("word_count", ""),
                "voice_length_flag": checks.get("voice_length_flag", ""),
                "data_status": status,
                "reply": row.get("reply", ""),
                "error": row.get("error", ""),
                "human_semantic_grade": "",
                "notes": "",
            }
            review.append(item)
            rows.append(item)
        replies = [row for row in rows if row["data_status"] == "response_available"]
        summary.append(
            {
                "case_id": case.id,
                "group": case.group,
                "level": case.level,
                "mode": case.mode,
                "expected_language": case.rules.language,
                "planned_runs": 3,
                "responses": len(replies),
                "no_data": sum(row["data_status"] == "no_data" for row in rows),
                "not_run_or_pending": sum(
                    row["data_status"] in ("not_run", "pending_retry") for row in rows
                ),
                "language_match": sum(
                    row["language_hint"] == case.rules.language for row in replies
                ),
                "language_mismatch": sum(bool(row["language_flag"]) for row in replies),
                "language_uncertain": sum(
                    bool(row["language_review_required"]) for row in replies
                ),
                "voice_length_flags": sum(
                    bool(row["voice_length_flag"]) for row in replies
                ),
                "voice_word_counts": (
                    [row["word_count"] for row in replies]
                    if case.mode == "voice"
                    else []
                ),
                "semantic_grade": "human_pending",
            }
        )
    (output / "summary.json").write_text(
        json.dumps(
            {
                **metadata,
                "stop_reason": stop_reason,
                "calls_used": len(read_rows(output / "attempts.jsonl")),
                "language_decision": language_decision(review),
                "by_case": summary,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    with (output / "review.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(review[0]))
        writer.writeheader()
        writer.writerows({k: run.csv_cell(v) for k, v in row.items()} for row in review)
    table = [
        "# Bước 1 — pilot ngôn ngữ v7",
        "",
        f"Ngày: {metadata['date']} (Asia/Ho_Chi_Minh).",
        f"Model: `{metadata['model']}`.",
        f"SHA-256 persona.v7: `{metadata['prompt_sha256']}`.",
        f"SHA-256 corpus: `{metadata['corpus_sha256']}`.",
        f"Dừng: `{stop_reason}`. Số request đã bắt đầu: "
        f"{len(read_rows(output / 'attempts.jsonl'))}/36.",
        "",
        "Kỳ vọng cả sáu case là tiếng Anh. Voice chỉ gắn cờ khi trên 45 từ. "
        "Unknown cần xem tay, không tính là khớp. Lỗi provider là chưa có dữ liệu; "
        "không tính đạt/trượt. Không có Blaze/audio hoặc LLM-judge trong bước 1.",
        "",
        "| ID | Level | Mode | Reply/3 | Chưa có dữ liệu | Chưa chạy/chờ retry "
        "| Khớp ngôn ngữ | Sai | Chưa rõ | Voice >45 | Từ voice |",
        "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    for row in summary:
        table.append(
            f"| {row['case_id']} | {row['level']} | {row['mode']} "
            f"| {row['responses']} | {row['no_data']} "
            f"| {row['not_run_or_pending']} | {row['language_match']} "
            f"| {row['language_mismatch']} | {row['language_uncertain']} "
            f"| {row['voice_length_flags']} | {row['voice_word_counts']} |"
        )
    table += first_lines(review)
    decision = language_decision(review)
    table += [
        "",
        f"Quy tắc chốt trước: ≥15/18 tiếng Anh giữ A; thấp hơn chỉ đề xuất B, "
        f"không áp dụng. Kết quả: {decision['english']}/18; "
        f"`{decision['outcome']}`. Đây là quyết định phương án ngôn ngữ, "
        "không phải nghiệm thu chất lượng.",
        "",
        "Đây là kiểm tra hình thức trên cỡ mẫu nhỏ, chưa chấm ngữ nghĩa hoặc "
        "kết luận đạt ngưỡng/v7 tốt hơn. Phản hồi và cờ từng lần ở review.csv; "
        "ledger/results lưu từng lần ngay. Dừng chờ người dùng trước bước 2/judge.",
    ]
    (output / "SCREENING.md").write_text("\n".join(table) + "\n", encoding="utf-8")


async def execute(
    settings: Settings,
    output: Path = OUTPUT,
    *,
    resume: bool = False,
    interval: float = 6.0,
    transport: httpx.AsyncBaseTransport | None = None,
) -> None:
    """Run just step one, stop on 429, and retry each 502 no more than once."""
    cases = inputs()
    prompts = {case.id: run.compose_prompt(case, "persona.v7") for case in cases}
    metadata: Row = {
        "date": DATE,
        "model": settings.gemini_chat_model,
        "version": "persona.v7",
        "prompt_sha256": PROMPT_SHA256,
        "corpus_sha256": CORPUS_SHA256,
        "max_output_tokens": settings.gemini_max_output_tokens,
        "temperature": "provider_default",
        "slot_budget": 18,
        "request_budget": 36,
        "max_502_retries_per_slot": 1,
        "interval_seconds": interval,
        "campaign": "single_language_repair_20261113",
        "previous_prompt_sha256": (
            "997b9d670063be071e671e7dce7849c211aa4453b0ae0e56dc45f47d651ab958"
        ),
        "precommitted_language_rule": {
            "required_english": 15,
            "denominator": 18,
            "below_threshold": "stop_propose_B_diff_only_no_further_prompt_edit",
        },
        "wire_prompt_sha256": {
            case.id: run.digest(prompts[case.id] + f"\nLearner level: {case.level}")
            for case in cases
        },
        "blaze_calls": 0,
        "judge_calls": 0,
        "voice_evaluation": "text_transcript_with_voice_identity_no_audio",
    }
    if resume:
        saved = json.loads((output / "metadata.json").read_text(encoding="utf-8"))
        if any(saved.get(key) != value for key, value in metadata.items()):
            raise ValueError("Resume metadata changed; no network calls allowed.")
        metadata = saved
    else:
        output.mkdir(parents=True, exist_ok=False)
        metadata["started_at"] = now().isoformat()
        (output / "metadata.json").write_text(
            json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
        )
    plan = [(case, repetition) for repetition in range(1, 4) for case in cases]
    results = restore(output, metadata, plan)
    call_count = len(read_rows(output / "attempts.jsonl"))
    retry_after = 0.0
    provider_status: int | None = None

    async def response_hook(response: httpx.Response) -> None:
        nonlocal retry_after, provider_status
        retry_after = retry_after_seconds(response.headers.get("Retry-After"))
        provider_status = response.status_code

    secret = (
        settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else ""
    )
    stop_reason = "interrupted_or_guard_failure"
    try:
        async with httpx.AsyncClient(
            trust_env=False,
            follow_redirects=False,
            timeout=httpx.Timeout(30, connect=10),
            event_hooks={"response": [response_hook]},
            transport=transport,
        ) as http_client:
            client = GeminiLLMClient(settings, http_client=http_client)
            for slot, (case, repetition) in enumerate(plan, 1):
                history = [row for row in results if row["slot"] == slot]
                if history and history[-1].get("terminal"):
                    continue
                first_retry = 1 if history else 0
                for retry in range(first_retry, 2):
                    # Revalidate file bytes, not read_prompt's cache, before every call.
                    inputs()
                    wait = interval
                    if results:
                        deadline = results[-1].get("not_before")
                        if deadline:
                            wait = max(
                                wait,
                                (
                                    datetime.fromisoformat(deadline) - now()
                                ).total_seconds(),
                            )
                    if wait > 60:
                        stop_reason = "retry_after_pause_resume_later"
                        return
                    await asyncio.sleep(max(0.0, wait))
                    inputs()
                    if call_count >= 36:
                        raise RuntimeError("Hard request ceiling reached.")
                    call_count += 1
                    retry_after = 0.0
                    provider_status = None
                    record: Row = {
                        "date": metadata["date"],
                        "model": metadata["model"],
                        "prompt_sha256": metadata["prompt_sha256"],
                        "slot": slot,
                        "case_id": case.id,
                        "repetition": repetition,
                        "retry": retry,
                        "attempt": call_count,
                        "at": now().isoformat(),
                    }
                    append(output / "attempts.jsonl", record)
                    try:
                        reply = await client.generate(
                            case.user_message,
                            case.level,
                            prompts[case.id],
                            case.history,
                        )
                        record.update(
                            reply=run.redact(reply, [secret]),
                            checks=run.automatic_checks(case, reply, prompts[case.id]),
                            data_status="response_available",
                            terminal=True,
                        )
                    except (HTTPException, httpx.HTTPError) as error:
                        status = (
                            error.status_code
                            if isinstance(error, HTTPException)
                            else None
                        )
                        record.update(
                            error=f"HTTP_{status}" if status else type(error).__name__,
                            failure_kind=run.safe_failure_kind(error),
                            data_status="no_data",
                            terminal=not (status == 502 and retry == 0),
                            retry_after_seconds=retry_after,
                            provider_http_status=provider_status,
                        )
                        if retry_after or status in (429, 502):
                            delay = max(retry_after, 30.0 if status == 429 else 10.0)
                            record["not_before"] = (
                                now() + timedelta(seconds=delay)
                            ).isoformat()
                    record["completed_at"] = now().isoformat()
                    append(output / "results.jsonl", record)
                    results.append(record)
                    print(
                        f"Slot {slot}/18, request {call_count}/36, retry {retry}: "
                        f"{record['data_status']}",
                        flush=True,
                    )
                    if record.get("error") == "HTTP_429":
                        stop_reason = "http_429_stopped_waiting_for_user"
                        return
                    if record["terminal"]:
                        break
            stop_reason = "completed_waiting_for_user"
    finally:
        export(output, metadata, cases, stop_reason)


def main() -> None:
    """Keep default offline; expose no full-suite or judge execution flag."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    try:
        inputs()
        if not args.execute:
            print(
                "Offline: 6 cases x 3, v7 only; 18 slots, "
                "36-call ceiling including 502 retries."
            )
            return
        config = dotenv_values(run.REPO_ROOT / ".env")
        key = os.getenv("GEMINI_API_KEY") or config.get("GEMINI_API_KEY")
        if not key:
            raise ValueError("Gemini credentials are not configured.")
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
        asyncio.run(execute(settings, resume=args.resume))
    except Exception as error:
        print(f"Stopped safely: {type(error).__name__}; inspect local artifacts.")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
