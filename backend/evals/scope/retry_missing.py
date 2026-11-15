"""Opt-in one-shot recovery of exactly four missing pilot responses; no full run."""

import argparse
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import dotenv_values
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.core.prompts import read_prompt
from app.llm.gemini import GeminiLLMClient
from evals.scope import run

SOURCE = run.ROOT / "results/pilot-20261112-revised"
OUTPUT = run.ROOT / "results/retry-missing-20261112"
SLOTS = (
    (4, "adversarial-005", "persona.v7", 1),
    (16, "revision-mixed_request-001", "persona.v7", 1),
    (17, "revision-regression_v6-002", "persona.v6", 1),
    (44, "adversarial-005", "persona.v6", 2),
)


def validate_source(settings: Settings) -> tuple[list[run.Case], run.Manifest]:
    """Refuse new slots, changed prompts/settings or incomplete original ledgers."""
    cases, manifest = run.load_cases()
    metadata = json.loads((SOURCE / "metadata.json").read_text(encoding="utf-8"))
    expected = {
        **metadata,
        "model": settings.gemini_chat_model,
        "max_output_tokens": settings.gemini_max_output_tokens,
        "corpus_sha256": manifest.corpus_sha256,
        "prompt_sha256": {
            version: run.digest(read_prompt(run.PROMPTS / f"{version}.txt"))
            for version in manifest.versions
        },
    }
    if run.validate_continuation(SOURCE, expected, cases, manifest) != 120:
        raise ValueError(
            "Original pilot must be complete before missing-only recovery."
        )
    rows = [
        json.loads(line)
        for line in (SOURCE / "results.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    missing = tuple(
        (row["attempt"], row["case_id"], row["version"], row["repetition"])
        for row in rows
        if row.get("error") == "HTTP_502"
    )
    if missing != SLOTS or sum("error" in row for row in rows) != 4:
        raise ValueError("Only the four explicitly approved HTTP 502 slots may retry.")
    if expected["prompt_sha256"]["persona.v6"] != run.V6_SHA256:
        raise ValueError("Immutable v6 changed.")
    return cases, manifest


async def execute(
    settings: Settings, output: Path = OUTPUT, *, interval_seconds: float = 10.0
) -> None:
    """Persist each retry before sending; stop on any error, never retry a retry."""
    cases, _ = validate_source(settings)
    by_id = {case.id: case for case in cases}
    output.mkdir(parents=True, exist_ok=False)
    metadata = {
        "source": SOURCE.name,
        "source_results_sha256": run.digest(
            (SOURCE / "results.jsonl").read_text(encoding="utf-8")
        ),
        "started_at": datetime.now(run.LOCAL_ZONE).isoformat(),
        "max_calls": 4,
        "max_retries_per_slot": 1,
        "interval_seconds": interval_seconds,
        "stop_on_any_error": True,
        "model": settings.gemini_chat_model,
        "max_output_tokens": settings.gemini_max_output_tokens,
        "original_missing_status": "no_data_neither_pass_nor_fail",
        "judge": "human_pending",
    }
    (output / "metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    secret = (
        settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else ""
    )
    async with httpx.AsyncClient(
        trust_env=False, follow_redirects=False, timeout=httpx.Timeout(30, connect=10)
    ) as http_client:
        client = GeminiLLMClient(settings, http_client=http_client)
        for original, case_id, version, repetition in SLOTS:
            # Also delay before the first retry, not only between requests.
            await asyncio.sleep(interval_seconds)
            case = by_id[case_id]
            prompt = run.compose_prompt(case, version)
            record: dict[str, object] = {
                "original_attempt": original,
                "case_id": case_id,
                "version": version,
                "repetition": repetition,
                "retry": 1,
                "at": datetime.now(run.LOCAL_ZONE).isoformat(),
            }
            with (output / "attempts.jsonl").open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record) + "\n")
            failed = False
            try:
                reply = await client.generate(
                    case.user_message, case.level, prompt, case.history
                )
                record["reply"] = run.redact(reply, [secret])
                record["checks"] = run.automatic_checks(case, reply, prompt)
                record["data_status"] = "response_available_human_review_pending"
            except (HTTPException, httpx.HTTPError) as error:
                failed = True
                record["error"] = (
                    f"HTTP_{error.status_code}"
                    if isinstance(error, HTTPException)
                    else type(error).__name__
                )
                record["failure_kind"] = run.safe_failure_kind(error)
                record["data_status"] = "no_data_neither_pass_nor_fail"
            with (output / "results.jsonl").open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
            status = "error; stopped" if failed else "saved"
            print(f"Retry original attempt {original}: {status}", flush=True)
            if failed:
                raise RuntimeError("Recovery stopped; no more requests or retries.")


def main() -> None:
    """Read credentials only after explicit opt-in; fixed output prevents reruns."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not args.execute:
        print("Offline: four fixed HTTP 502 slots; at most one retry each; delay 10s.")
        return
    try:
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
        asyncio.run(execute(settings))
    except Exception as error:
        print(f"Stopped safely: {type(error).__name__}; inspect local artifacts.")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
