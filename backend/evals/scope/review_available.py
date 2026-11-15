"""Audit saved synthetic responses offline; never execute or resume generation."""

import csv
import hashlib
import json
import math
import random
from collections import Counter, defaultdict, deque
from pathlib import Path

from evals.scope import campaign, run

Row = campaign.Row
SOURCE = campaign.OUTPUT / "full"
OUTPUT = run.ROOT / "results/available-review-20261114"
MANDATORY = frozenset({"safety", "identity", "checkpoint", "adversarial"})
SEED = 20261114


def select_reviews(rows: list[Row]) -> tuple[list[Row], list[Row]]:
    """Select every high-risk/flagged response and additional seeded strata."""
    rng = random.Random(SEED)
    strata: dict[tuple[str, str], list[Row]] = defaultdict(list)
    for row in rows:
        strata[(row["version"], row["group"])].append(row)
    selected: list[Row] = []
    sampling: list[Row] = []
    for (version, group), population in sorted(strata.items()):
        population = sorted(population, key=lambda row: row["slot"])
        reasons = {
            row["slot"]: (
                "mandatory_group" if group in MANDATORY else "flagged_or_uncertain"
            )
            for row in population
            if group in MANDATORY or row["screen_status"] != "screen_clear"
        }
        remaining = [row for row in population if row["slot"] not in reasons]
        target = math.ceil(len(population) / 5)
        count = 0 if group in MANDATORY else min(target, len(remaining))
        for row in rng.sample(remaining, count):
            reasons[row["slot"]] = "additional_seeded_random"
        selected.extend(
            {**row, "selection_reason": reasons[row["slot"]]}
            for row in population
            if row["slot"] in reasons
        )
        sampling.append(
            {
                "version": version,
                "group": group,
                "available": len(population),
                "random_target": target,
                "random_additional": count,
                "selected": len(reasons),
                "all_selected": len(reasons) == len(population),
            }
        )
    return selected, sampling


def interleave_pending(rows: list[Row]) -> list[Row]:
    """Round-robin original slot IDs by version/group without changing the ledger."""
    queues: dict[tuple[str, str], deque[Row]] = defaultdict(deque)
    for row in sorted(rows, key=lambda item: item["slot"]):
        queues[(row["version"], row["group"])].append(row)
    result: list[Row] = []
    while any(queues.values()):
        for key in sorted(queues):
            if queues[key]:
                result.append(queues[key].popleft())
    return result


def write_csv(path: Path, rows: list[Row]) -> None:
    """Write spreadsheet-safe cells without interpreting generated formulas."""
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows({k: run.csv_cell(v) for k, v in row.items()} for row in rows)


def protect_hand_grades(output: Path) -> None:
    """Refuse regeneration once a reviewer has filled any human assessment field."""
    sheet = output / "manual_review.csv"
    if not sheet.exists():
        return
    with sheet.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if any(
                row.get(key, "").strip()
                for key in ("human_grade", "human_reason", "human_evidence")
            ):
                raise ValueError(
                    "Human review exists; export to a new snapshot directory."
                )


def generate(source: Path = SOURCE, output: Path = OUTPUT) -> Row:
    """Recompute checks from frozen inputs and export a separate review snapshot."""
    if (
        output.resolve() == source.resolve()
        or source.resolve() in output.resolve().parents
    ):
        raise ValueError("Review output must not overwrite historical campaign files.")
    protect_hand_grades(output)
    slots = campaign.plan("full")
    metadata = json.loads((source / "metadata.json").read_text(encoding="utf-8"))
    if metadata["frozen_files"] != campaign.frozen_files():
        raise ValueError("Frozen composition/checker sources changed.")
    paths = [source / "attempts.jsonl", source / "results.jsonl"]
    source_hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    attempts, results = [
        [json.loads(line) for line in p.read_text(encoding="utf-8").splitlines()]
        for p in paths
    ]
    if len(attempts) != len(results):
        raise ValueError("Unresolved ledger; do not infer or replay a request.")
    latest: dict[int, Row] = {}
    for index, (attempt, row) in enumerate(zip(attempts, results, strict=True), 1):
        if attempt["attempt"] != index or any(
            row.get(k) != v for k, v in attempt.items()
        ):
            raise ValueError("Attempt/result provenance differs.")
        case, version, repetition = slots[row["slot"] - 1]
        if (row["case_id"], row["version"], row["repetition"]) != (
            case.id,
            version,
            repetition,
        ) or row["campaign_prompt_sha256"] != campaign.PROMPT_SHA256:
            raise ValueError("Recorded slot differs from frozen plan.")
        latest[row["slot"]] = row
    reviews: list[Row] = []
    pending: list[Row] = []
    missing: list[Row] = []
    groups: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    raw_flags: Counter[str] = Counter()
    changed_checks = 0
    for slot, (case, version, repetition) in enumerate(slots, 1):
        identity = {
            "slot": slot,
            "case_id": case.id,
            "version": version,
            "group": case.group,
            "repetition": repetition,
        }
        counts = groups[(version, case.group)]
        counts["planned"] += 1
        row = latest.get(slot)
        if row is None:
            pending.append(identity)
            counts["not_run"] += 1
            continue
        if row.get("data_status") != "response_available":
            missing.append(
                {
                    **identity,
                    "error": row.get("error"),
                    "failure_kind": row.get("failure_kind"),
                }
            )
            counts["terminal_no_data"] += 1
            continue
        checks = run.automatic_checks(
            case, row["reply"], run.compose_prompt(case, version)
        )
        changed_checks += checks != row["checks"]
        status = campaign.classify({**row, "checks": checks})
        counts["responses"] += 1
        counts[f"repeat_{repetition}"] += 1
        counts[status] += 1
        raw_flags.update(
            k for k, value in checks.items() if k.endswith("_flag") and value
        )
        reviews.append(
            {
                **identity,
                "level": case.level,
                "mode": case.mode,
                "phase": case.phase,
                "lesson_id": case.lesson_id,
                "voice_gender": case.voice_gender,
                "user_message": case.user_message,
                "history": json.dumps(case.history, ensure_ascii=False),
                "expected": case.expected,
                "must": json.dumps(case.must, ensure_ascii=False),
                "must_not": json.dumps(case.must_not, ensure_ascii=False),
                "reply": row["reply"],
                "reply_sha256": run.digest(row["reply"]),
                "checks": json.dumps(checks, ensure_ascii=False),
                "screen_status": status,
                "human_grade": "",
                "human_reason": "",
                "human_evidence": "",
            }
        )
    selected, sampling = select_reviews(reviews)
    summary: Row = {
        "date": "2026-11-14",
        "prompt_sha256": campaign.PROMPT_SHA256,
        "corpus_sha256": campaign.CORPUS_SHA256,
        "source_hashes": source_hashes,
        "source_requests": len(attempts),
        "responses": len(reviews),
        "checks_changed": changed_checks,
        "raw_flag_counts": dict(raw_flags),
        "manual_responses": len(selected),
        "sampling_unit": "available_response",
        "seed": SEED,
        "strata": sampling,
        "api_calls": 0,
        "judge_calls": 0,
        "groups": [
            {"version": v, "group": g, **dict(c)} for (v, g), c in groups.items()
        ],
        "terminal_no_data": missing,
        "resume_proposal": {
            "status": "not_executable_waiting_for_quota_confirmation",
            "unattempted_slots": len(pending),
            "additional_request_cap": 2 * len(pending),
            "total_cap_including_history": len(attempts) + 2 * len(pending),
            "terminal_errors_excluded": len(missing),
        },
    }
    output.mkdir(parents=True, exist_ok=True)
    write_csv(output / "all_responses.csv", reviews)
    write_csv(output / "manual_review.csv", selected)
    (output / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output / "pending_interleaved.json").write_text(
        json.dumps(interleave_pending(pending), indent=2) + "\n", encoding="utf-8"
    )
    if any(
        hashlib.sha256(p.read_bytes()).hexdigest() != source_hashes[p.name]
        for p in paths
    ):
        raise ValueError("Historical source changed during review.")
    return summary


if __name__ == "__main__":
    report = generate()
    print(
        json.dumps(
            {
                k: report[k]
                for k in (
                    "responses",
                    "checks_changed",
                    "manual_responses",
                    "api_calls",
                    "judge_calls",
                )
            }
        )
    )
