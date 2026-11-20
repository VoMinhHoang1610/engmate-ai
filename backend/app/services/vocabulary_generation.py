"""Owner-scoped, quota-bound generation of private AI vocabulary topics."""

import asyncio
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import cast
from uuid import uuid4

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError
from sqlalchemy import Connection, and_, delete, func, select, update

from app.core.config import Settings
from app.core.prompts import read_prompt
from app.core.request_limits import AuthLimiter
from app.db.database import Database, Record
from app.db.vocabulary import (
    TERMINAL_JOB_STATUSES,
    custom_topics,
    custom_words,
    generation_jobs,
    usage,
    word_states,
)
from app.llm.base import LLMClient
from app.schemas.ai import Level
from app.schemas.vocabulary import (
    GeneratedBatch,
    GeneratedTopic,
    GenerationCreate,
    Word,
)
from app.services.common import now
from app.services.vocabulary import VocabularyService

PROMPT_VERSION = "vocab.v1"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / f"{PROMPT_VERSION}.txt"
REVIEW_STATUS = "ai_generated_unreviewed"
JOB_KIND = "vocabulary_generation"
POLL_AFTER_MS = 2000
TOKEN_CAP = 2048
TARGET_DEADLINES = {30: 360, 60: 660}


class VocabularyGenerationError(Exception):
    """A terminal job condition that is safe to expose as a stable code."""

    def __init__(self, code: str) -> None:
        """Keep only the stable error code, never raw provider text."""
        self.code = code
        super().__init__(code)


class VocabularyJobManager:
    """Reserve one in-process slot per account before a job can be persisted."""

    def __init__(self, settings: Settings) -> None:
        """Bound active jobs independently from chat and speech admission."""
        self.total = settings.vocabulary_max_jobs
        self.per_user = settings.vocabulary_max_jobs_per_user
        self.active = 0
        self.users: Counter[int] = Counter()
        self.tasks: dict[tuple[int, str], asyncio.Task[None]] = {}
        self.lock = Lock()

    def reserve(self, user_id: int) -> None:
        """Reject overload before a provider call or a durable reservation."""
        with self.lock:
            if self.active >= self.total or self.users[user_id] >= self.per_user:
                raise HTTPException(
                    429,
                    {
                        "code": "vocabulary_too_many_jobs",
                        "message": (
                            "Too many active vocabulary jobs; try again shortly."
                        ),
                    },
                    headers={"Retry-After": "2"},
                )
            self.active += 1
            self.users[user_id] += 1

    def release(self, user_id: int) -> None:
        """Release exactly one reservation, including cancellation and errors."""
        with self.lock:
            if self.users[user_id] <= 0:
                return
            self.active = max(0, self.active - 1)
            self.users[user_id] -= 1
            if self.users[user_id] == 0:
                del self.users[user_id]

    def track(self, user_id: int, request_id: str, task: asyncio.Task[None]) -> None:
        """Remember a task only while it is still running."""
        if not task.done():
            self.tasks[(user_id, request_id)] = task

    def forget(self, user_id: int, request_id: str) -> None:
        """Drop a finished task so repeated jobs do not grow the registry."""
        self.tasks.pop((user_id, request_id), None)

    def cancel(self, user_id: int, request_id: str) -> None:
        """Cancel the local task after the durable job is already terminal."""
        task = self.tasks.get((user_id, request_id))
        if task is not None:
            if task.done():
                self.tasks.pop((user_id, request_id), None)
            else:
                # Keep it tracked until its cancellation cleanup finishes.
                task.cancel()

    async def drain(self) -> None:
        """Wait for every tracked task without cancelling it; tests use this."""
        tasks = list(self.tasks.values())
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def shutdown(self) -> None:
        """Cancel local work on application shutdown; DB is the source of truth."""
        tasks = list(self.tasks.values())
        self.tasks.clear()
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


def batch_budget(target_count: int, batch_size: int) -> int:
    """Reserve the worst case of one generation and one repair per batch."""
    return 2 * math.ceil(target_count / batch_size)


def payload_hash(topic: str, target_count: int) -> str:
    """Hash the submitted data; the topic itself is never persisted."""
    payload = ["generation", topic, target_count, PROMPT_VERSION]
    return hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()


def public_job(row: Record) -> Record:
    """Expose only stable polling fields, never the hash or the submitted text."""
    return {
        "request_id": row["RequestId"],
        "status": row["Status"],
        "target_count": int(row["TargetCount"]),
        "validated_count": int(row["ValidatedCount"]),
        "batch_size": int(row["BatchSize"]),
        "poll_after_ms": POLL_AFTER_MS,
        "topic_id": row["TopicId"],
        "error_code": row["ErrorCode"],
        "retry_after": None,
    }


def normalized_term(term: str) -> str:
    """Compare generated terms by NFC, case and whitespace, not by substring."""
    return " ".join(unicodedata.normalize("NFC", term).casefold().split())


def word_id(term: str, used: set[str]) -> str:
    """Create a bounded lowercase server-owned ID from an English term."""
    ascii_term = (
        unicodedata.normalize("NFKD", term).encode("ascii", "ignore").decode().lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_term).strip("-")[:70] or "word"
    candidate = slug
    suffix = 2
    while candidate in used:
        candidate = f"{slug}-{suffix}"[:80]
        suffix += 1
    used.add(candidate)
    return candidate


def parse_batch(raw: str) -> GeneratedBatch:
    """Parse one strict provider envelope, tolerating only a JSON code fence."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("Provider output is not JSON.") from exc
    if not isinstance(data, dict):
        raise ValueError("Provider output must be an object.")
    return GeneratedBatch.model_validate(data)


def map_provider_error(exc: HTTPException) -> str:
    """Translate provider status into a small, user-safe job code."""
    return {
        429: "provider_rate_limited",
        502: "provider_unavailable",
        503: "provider_not_configured",
        504: "provider_timeout",
    }.get(exc.status_code, "provider_error")


def seconds_until_utc_midnight() -> int:
    """Return a bounded Retry-After for a daily quota rejection."""
    timestamp = datetime.now(UTC)
    tomorrow = datetime.combine(
        timestamp.date() + timedelta(days=1), datetime.min.time(), UTC
    )
    return max(1, int((tomorrow - timestamp).total_seconds()))


class VocabularyGenerationService(VocabularyService):
    """Generate, validate and publish a private topic without storing raw input."""

    def __init__(
        self,
        database: Database,
        settings: Settings,
        jobs: VocabularyJobManager,
        limiter: AuthLimiter,
    ) -> None:
        """Bind process-local admission and the shared per-account limiter."""
        super().__init__(database)
        self.settings = settings
        self.jobs = jobs
        self.limiter = limiter

    def require_supported(self) -> None:
        """Reject an unsupported output cap before reserving any paid budget."""
        cap = (
            self.settings.openai_max_output_tokens
            if self.settings.llm_provider == "openai"
            else self.settings.gemini_max_output_tokens
        )
        if cap > TOKEN_CAP:
            raise HTTPException(
                503,
                {
                    "code": "vocabulary_token_cap_unsupported",
                    "message": (
                        "Vocabulary generation requires an output cap of 2048 "
                        "tokens or fewer."
                    ),
                },
            )
        if self.settings.llm_provider != "mock" and not self.settings.chat_configured:
            raise HTTPException(
                503,
                {
                    "code": "vocabulary_provider_not_configured",
                    "message": "Configure the selected AI provider for vocabulary.",
                },
            )

    def _deadline(self, target_count: int) -> datetime:
        """Use the smaller of the configured ceiling and the target budget."""
        target_limit = TARGET_DEADLINES[target_count]
        return now() + timedelta(
            seconds=min(self.settings.vocabulary_job_deadline_seconds, target_limit)
        )

    def _cefr(self, connection: Connection, user_id: int) -> str:
        """Snapshot the learner band once; never accept a level from the client."""
        profiles = self.db.models.table("LearnerProfiles", connection)
        level = connection.execute(
            select(profiles.c.CefrLevel).where(profiles.c.UserId == user_id)
        ).scalar_one_or_none()
        value = str(level or "A2")
        return "A1" if value == "Pre-A1" else value

    def prepare_start(
        self, user: Record, data: GenerationCreate
    ) -> tuple[Record, bool]:
        """Replay before quota; reserve quota and a local slot atomically."""
        user_id = int(user["UserId"])
        request_id = str(data.client_request_id)
        target_count = int(data.target_count)
        digest = payload_hash(data.topic, target_count)
        reserved = False
        try:
            with self.transaction(user_id) as connection:
                existing = (
                    connection.execute(
                        select(generation_jobs).where(
                            generation_jobs.c.UserId == user_id,
                            generation_jobs.c.RequestId == request_id,
                        )
                    )
                    .mappings()
                    .first()
                )
                if existing:
                    row = dict(existing)
                    if row["PayloadHash"] != digest:
                        raise HTTPException(
                            409, "Request identity was used with different input."
                        )
                    return public_job(row), False

                self.require_supported()
                if target_count > self.settings.vocabulary_max_words:
                    raise HTTPException(
                        422,
                        {
                            "code": "vocabulary_target_unsupported",
                            "message": (
                                "Target word count exceeds the configured maximum."
                            ),
                        },
                    )
                self._expire_stale_in_connection(connection, user_id)
                self._purge_terminal(connection, user_id)
                today = now().date()
                usage_row = (
                    connection.execute(
                        select(usage).where(
                            usage.c.UserId == user_id,
                            usage.c.UsageDate == today,
                        )
                    )
                    .mappings()
                    .first()
                )
                jobs_started = int(usage_row["JobsStarted"]) if usage_row else 0
                calls_reserved = int(usage_row["CallsReserved"]) if usage_row else 0
                budget = batch_budget(target_count, self.settings.vocabulary_batch_size)
                if (
                    jobs_started >= self.settings.vocabulary_daily_jobs
                    or calls_reserved + budget
                    > self.settings.vocabulary_daily_provider_calls
                ):
                    raise HTTPException(
                        429,
                        {
                            "code": "vocabulary_quota_exhausted",
                            "message": (
                                "Daily vocabulary generation quota is exhausted."
                            ),
                        },
                        headers={"Retry-After": str(seconds_until_utc_midnight())},
                    )
                if not self.limiter.allow(str(user_id)):
                    raise HTTPException(
                        429,
                        {
                            "code": "vocabulary_start_rate_limited",
                            "message": "Too many vocabulary starts; try again shortly.",
                        },
                        headers={"Retry-After": "60"},
                    )

                self.jobs.reserve(user_id)
                reserved = True
                timestamp = now()
                connection.execute(
                    generation_jobs.insert().values(
                        UserId=user_id,
                        RequestId=request_id,
                        AuthSessionId=int(user.get("SessionId") or 0),
                        Kind=JOB_KIND,
                        PayloadHash=digest,
                        TargetCount=target_count,
                        BatchSize=self.settings.vocabulary_batch_size,
                        CefrLevel=self._cefr(connection, user_id),
                        Status="pending",
                        ValidatedCount=0,
                        CallsReserved=budget,
                        CallsUsed=0,
                        TopicId=None,
                        ErrorCode=None,
                        CreatedAt=timestamp,
                        UpdatedAt=timestamp,
                        ExpiresAt=self._deadline(target_count),
                        FinishedAt=None,
                    )
                )
                if usage_row:
                    connection.execute(
                        usage.update()
                        .where(
                            usage.c.UserId == user_id,
                            usage.c.UsageDate == today,
                        )
                        .values(
                            JobsStarted=usage.c.JobsStarted + 1,
                            CallsReserved=usage.c.CallsReserved + budget,
                            UpdatedAt=timestamp,
                        )
                    )
                else:
                    connection.execute(
                        usage.insert().values(
                            UserId=user_id,
                            UsageDate=today,
                            JobsStarted=1,
                            CallsReserved=budget,
                            CallsUsed=0,
                            UpdatedAt=timestamp,
                        )
                    )
                created = (
                    connection.execute(
                        select(generation_jobs).where(
                            generation_jobs.c.UserId == user_id,
                            generation_jobs.c.RequestId == request_id,
                        )
                    )
                    .mappings()
                    .one()
                )
                return public_job(dict(created)), True
        except Exception:
            if reserved:
                self.jobs.release(user_id)
            raise

    def _purge_terminal(self, connection: Connection, user_id: int) -> None:
        """Lazily remove old terminal jobs; no scheduler is required."""
        cutoff = now() - timedelta(days=self.settings.vocabulary_job_retention_days)
        connection.execute(
            delete(generation_jobs).where(
                generation_jobs.c.UserId == user_id,
                generation_jobs.c.Status.in_(TERMINAL_JOB_STATUSES),
                generation_jobs.c.UpdatedAt < cutoff,
            )
        )

    def _expire_stale_in_connection(
        self, connection: Connection, user_id: int | None = None
    ) -> None:
        """Recover interrupted work and refund only calls never sent."""
        condition = and_(
            generation_jobs.c.Status.in_(("pending", "running")),
            generation_jobs.c.ExpiresAt <= now(),
        )
        if user_id is not None:
            condition = and_(condition, generation_jobs.c.UserId == user_id)
        rows = (
            connection.execute(select(generation_jobs).where(condition))
            .mappings()
            .all()
        )
        for raw in rows:
            self._finish_in_connection(connection, dict(raw), "failed", "interrupted")

    def _finish_in_connection(
        self,
        connection: Connection,
        job: Record,
        status: str,
        error_code: str | None,
    ) -> None:
        """Write one terminal state and refund only unsent provider calls."""
        if job["Status"] in TERMINAL_JOB_STATUSES:
            return
        timestamp = now()
        connection.execute(
            update(generation_jobs)
            .where(
                generation_jobs.c.UserId == job["UserId"],
                generation_jobs.c.RequestId == job["RequestId"],
                generation_jobs.c.Status.in_(("pending", "running")),
            )
            .values(
                Status=status,
                ErrorCode=error_code,
                UpdatedAt=timestamp,
                FinishedAt=timestamp,
            )
        )
        refund = max(0, int(job["CallsReserved"]) - int(job["CallsUsed"]))
        if refund:
            connection.execute(
                update(usage)
                .where(
                    usage.c.UserId == job["UserId"],
                    usage.c.UsageDate == job["CreatedAt"].date(),
                )
                .values(
                    CallsReserved=func.greatest(usage.c.CallsReserved - refund, 0),
                    UpdatedAt=timestamp,
                )
            )

    def _mark_running(self, user_id: int, request_id: str) -> bool:
        """Move one owned pending job to running, or stop if it is terminal."""
        with self.transaction(user_id) as connection:
            row = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .first()
            )
            if not row:
                return False
            job = dict(row)
            if job["Status"] != "pending":
                return False
            if job["ExpiresAt"] <= now():
                self._finish_in_connection(connection, job, "failed", "interrupted")
                return False
            connection.execute(
                update(generation_jobs)
                .where(
                    generation_jobs.c.UserId == user_id,
                    generation_jobs.c.RequestId == request_id,
                    generation_jobs.c.Status == "pending",
                )
                .values(Status="running", UpdatedAt=now())
            )
            return True

    def _reserve_call(self, user_id: int, request_id: str) -> str | None:
        """Count a provider call before sending it; errors still consume budget."""
        with self.transaction(user_id) as connection:
            row = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .first()
            )
            if not row:
                return "interrupted"
            job = dict(row)
            if job["Status"] != "running":
                return "cancelled" if job["Status"] == "cancelled" else "interrupted"
            if job["ExpiresAt"] <= now():
                self._finish_in_connection(connection, job, "failed", "interrupted")
                return "interrupted"
            if int(job["CallsUsed"]) >= int(job["CallsReserved"]):
                self._finish_in_connection(connection, job, "failed", "incomplete")
                return "incomplete"
            sessions = self.db.models.table("AuthSessions", connection)
            session = (
                connection.execute(
                    select(sessions.c.RevokedAt, sessions.c.ExpiresAt).where(
                        sessions.c.AuthSessionId == job["AuthSessionId"],
                        sessions.c.UserId == user_id,
                    )
                )
                .mappings()
                .first()
            )
            if (
                not session
                or session["RevokedAt"] is not None
                or session["ExpiresAt"] <= now()
            ):
                self._finish_in_connection(connection, job, "failed", "session_expired")
                return "session_expired"
            result = connection.execute(
                update(generation_jobs)
                .where(
                    generation_jobs.c.UserId == user_id,
                    generation_jobs.c.RequestId == request_id,
                    generation_jobs.c.Status == "running",
                    generation_jobs.c.CallsUsed == job["CallsUsed"],
                )
                .values(CallsUsed=generation_jobs.c.CallsUsed + 1, UpdatedAt=now())
            )
            if result.rowcount != 1:
                return "interrupted"
            connection.execute(
                update(usage)
                .where(
                    usage.c.UserId == user_id,
                    usage.c.UsageDate == job["CreatedAt"].date(),
                )
                .values(CallsUsed=usage.c.CallsUsed + 1, UpdatedAt=now())
            )
            return None

    def _save_progress(self, user_id: int, request_id: str, count: int) -> None:
        """Publish progress without exposing generated words before commit."""
        with self.transaction(user_id) as connection:
            connection.execute(
                update(generation_jobs)
                .where(
                    generation_jobs.c.UserId == user_id,
                    generation_jobs.c.RequestId == request_id,
                    generation_jobs.c.Status == "running",
                )
                .values(ValidatedCount=count, UpdatedAt=now())
            )

    async def run_job(
        self, user_id: int, request_id: str, topic: str, client: LLMClient
    ) -> None:
        """Run one job while holding its reserved process slot exactly once."""
        try:
            if not await run_in_threadpool(self._mark_running, user_id, request_id):
                return
            result = await self._generate(user_id, request_id, topic, client)
            if result is not None:
                await run_in_threadpool(self._publish, user_id, request_id, result)
        except VocabularyGenerationError as exc:
            await run_in_threadpool(
                self._finish, user_id, request_id, "failed", exc.code
            )
        except asyncio.CancelledError:
            try:
                await run_in_threadpool(
                    self._finish, user_id, request_id, "cancelled", None
                )
            finally:
                raise
        except Exception:
            await run_in_threadpool(
                self._finish, user_id, request_id, "failed", "internal_error"
            )
        finally:
            self.jobs.release(user_id)

    async def _generate(
        self, user_id: int, request_id: str, topic_text: str, client: LLMClient
    ) -> Record | None:
        """Generate batches sequentially and accept only fully validated words."""
        job = await run_in_threadpool(self._job_snapshot, user_id, request_id)
        if job is None:
            return None
        target = int(job["TargetCount"])
        batch_size = int(job["BatchSize"])
        cefr = cast(Level, job["CefrLevel"])
        system_prompt = read_prompt(PROMPT_PATH)
        accepted: list[Word] = []
        accepted_terms: set[str] = set()
        used_ids: set[str] = set()
        topic: GeneratedTopic | None = None
        while len(accepted) < target:
            round_target = min(target, len(accepted) + batch_size)
            start_count = len(accepted)
            for attempt in range(2):
                remaining = round_target - len(accepted)
                error = await run_in_threadpool(self._reserve_call, user_id, request_id)
                if error is not None:
                    raise VocabularyGenerationError(error)
                message = json.dumps(
                    {
                        "task": "generate_vocabulary_batch",
                        "topic": topic_text,
                        "target_count": target,
                        "batch_size": remaining,
                        "cefr_level": cefr,
                        "accepted_terms": sorted(accepted_terms),
                    },
                    ensure_ascii=False,
                )
                try:
                    raw = await client.generate(
                        message, cefr, system_prompt, history=None
                    )
                except HTTPException as exc:
                    if exc.status_code == 502 and attempt == 0:
                        continue
                    raise VocabularyGenerationError(map_provider_error(exc)) from None
                try:
                    batch = parse_batch(raw)
                except (ValidationError, ValueError):
                    if attempt == 0:
                        continue
                    raise VocabularyGenerationError("invalid_output") from None
                if batch.status == "refused":
                    raise VocabularyGenerationError("refused")
                if batch.status == "needs_clarification":
                    raise VocabularyGenerationError("needs_clarification")
                if topic is None:
                    topic = batch.topic
                before_accept = len(accepted)
                for item in batch.words:
                    if len(accepted) >= round_target:
                        break
                    normalized = normalized_term(item.term)
                    if normalized in accepted_terms:
                        continue
                    candidate = word_id(item.term, used_ids)
                    try:
                        word = Word.model_validate(
                            {**item.model_dump(), "id": candidate}
                        )
                    except ValidationError:
                        continue
                    accepted.append(word)
                    accepted_terms.add(normalized)
                if len(accepted) > before_accept:
                    await run_in_threadpool(
                        self._save_progress, user_id, request_id, len(accepted)
                    )
                if len(accepted) >= round_target:
                    break
            if len(accepted) == start_count:
                raise VocabularyGenerationError("invalid_output")
        if topic is None:
            raise VocabularyGenerationError("invalid_output")
        if len(accepted) < target:
            raise VocabularyGenerationError("incomplete")
        return {
            "topic": topic.model_dump(),
            "words": [word.model_dump() for word in accepted],
        }

    def _job_snapshot(self, user_id: int, request_id: str) -> Record | None:
        """Load only server-owned generation inputs at the start of a job."""
        with self.transaction(user_id) as connection:
            row = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .first()
            )
            return dict(row) if row else None

    def _publish(self, user_id: int, request_id: str, result: Record) -> Record | None:
        """Publish all words atomically only while the job is still running."""
        topic = GeneratedTopic.model_validate(result["topic"])
        words = [Word.model_validate(item) for item in result["words"]]
        with self.transaction(user_id) as connection:
            row = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .first()
            )
            if not row:
                return None
            job = dict(row)
            if job["Status"] != "running":
                return None
            if job["ExpiresAt"] <= now():
                self._finish_in_connection(connection, job, "failed", "interrupted")
                return None
            if len(words) != int(job["TargetCount"]):
                self._finish_in_connection(connection, job, "failed", "incomplete")
                return None
            topic_id = str(uuid4())
            content_hash = hashlib.sha256(
                json.dumps(
                    {"topic": topic.model_dump(), "words": result["words"]},
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode()
            ).hexdigest()
            timestamp = now()
            connection.execute(
                custom_topics.insert().values(
                    UserId=user_id,
                    TopicId=topic_id,
                    TitleVi=topic.title_vi,
                    TitleEn=topic.title_en,
                    Description=topic.description,
                    WordCount=len(words),
                    ReviewStatus=REVIEW_STATUS,
                    PromptVersion=PROMPT_VERSION,
                    ContentHash=content_hash,
                    CreatedAt=timestamp,
                )
            )
            for position, word in enumerate(words, 1):
                connection.execute(
                    custom_words.insert().values(
                        UserId=user_id,
                        TopicId=topic_id,
                        WordId=word.id,
                        Position=position,
                        Term=word.term,
                        PartOfSpeech=word.part_of_speech,
                        Ipa=word.ipa,
                        MeaningVi=word.meaning_vi,
                        ExampleEn=word.example_en,
                        ExampleVi=word.example_vi,
                        Cefr=word.cefr,
                        CreatedAt=timestamp,
                    )
                )
            connection.execute(
                update(generation_jobs)
                .where(
                    generation_jobs.c.UserId == user_id,
                    generation_jobs.c.RequestId == request_id,
                    generation_jobs.c.Status == "running",
                )
                .values(
                    Status="completed",
                    TopicId=topic_id,
                    ValidatedCount=len(words),
                    ErrorCode=None,
                    UpdatedAt=timestamp,
                    FinishedAt=timestamp,
                )
            )
            refund = max(0, int(job["CallsReserved"]) - int(job["CallsUsed"]))
            if refund:
                connection.execute(
                    update(usage)
                    .where(
                        usage.c.UserId == user_id,
                        usage.c.UsageDate == job["CreatedAt"].date(),
                    )
                    .values(
                        CallsReserved=func.greatest(usage.c.CallsReserved - refund, 0),
                        UpdatedAt=timestamp,
                    )
                )
            return {"topic_id": topic_id, "word_count": len(words)}

    def _finish(
        self,
        user_id: int,
        request_id: str,
        status: str,
        error_code: str | None,
    ) -> Record | None:
        """Make a terminal transition idempotent and refund unused calls once."""
        with self.transaction(user_id) as connection:
            row = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .first()
            )
            if not row:
                return None
            self._finish_in_connection(connection, dict(row), status, error_code)
            current = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .one()
            )
            return public_job(dict(current))

    def job(self, user_id: int, request_id: str) -> Record:
        """Read one owned job after lazy recovery of expired work."""
        with self.transaction(user_id) as connection:
            self._expire_stale_in_connection(connection, user_id)
            row = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .first()
            )
            if not row:
                raise HTTPException(404, "Vocabulary job not found.")
            return public_job(dict(row))

    def cancel(self, user_id: int, request_id: str) -> Record:
        """Cancel an active job; terminal jobs are an idempotent no-op."""
        with self.transaction(user_id) as connection:
            row = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .first()
            )
            if not row:
                raise HTTPException(404, "Vocabulary job not found.")
            self._finish_in_connection(connection, dict(row), "cancelled", None)
            current = (
                connection.execute(
                    select(generation_jobs).where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.RequestId == request_id,
                    )
                )
                .mappings()
                .one()
            )
            return public_job(dict(current))

    def topics(self, user_id: int, offset: int, limit: int) -> Record:
        """List only owned custom topics and the owner's current quota."""
        with self.transaction(user_id) as connection:
            self._expire_stale_in_connection(connection, user_id)
            rows = (
                connection.execute(
                    select(custom_topics)
                    .where(custom_topics.c.UserId == user_id)
                    .order_by(custom_topics.c.CreatedAt.desc())
                    .offset(offset)
                    .limit(limit)
                )
                .mappings()
                .all()
            )
            remembered: dict[str, int] = {
                str(topic_id): int(count)
                for topic_id, count in connection.execute(
                    select(word_states.c.TopicId, func.count())
                    .where(word_states.c.UserId == user_id)
                    .group_by(word_states.c.TopicId)
                ).all()
            }
            active = (
                connection.execute(
                    select(generation_jobs)
                    .where(
                        generation_jobs.c.UserId == user_id,
                        generation_jobs.c.Status.in_(("pending", "running")),
                    )
                    .order_by(generation_jobs.c.CreatedAt.desc())
                )
                .mappings()
                .all()
            )
            today = now().date()
            usage_row = (
                connection.execute(
                    select(usage).where(
                        usage.c.UserId == user_id, usage.c.UsageDate == today
                    )
                )
                .mappings()
                .first()
            )
            return {
                "topics": [
                    {
                        "topic_id": row["TopicId"],
                        "title_vi": row["TitleVi"],
                        "title_en": row["TitleEn"],
                        "description": row["Description"],
                        "word_count": int(row["WordCount"]),
                        "remembered_count": int(remembered.get(row["TopicId"], 0)),
                        "review_status": row["ReviewStatus"],
                        "source": "custom",
                        "created_at": row["CreatedAt"].replace(tzinfo=UTC).isoformat(),
                    }
                    for row in rows
                ],
                "active_jobs": [public_job(dict(row)) for row in active],
                "usage": {
                    "date": today.isoformat(),
                    "jobs_started": int(usage_row["JobsStarted"]) if usage_row else 0,
                    "jobs_limit": self.settings.vocabulary_daily_jobs,
                    "calls_reserved": (
                        int(usage_row["CallsReserved"]) if usage_row else 0
                    ),
                    "calls_used": int(usage_row["CallsUsed"]) if usage_row else 0,
                    "calls_limit": self.settings.vocabulary_daily_provider_calls,
                    "resets_at": datetime.combine(
                        today + timedelta(days=1), datetime.min.time(), UTC
                    ).isoformat(),
                },
            }

    def topic_detail(self, user_id: int, topic_id: str) -> Record:
        """Return one owned topic with all words, states and generation label."""
        with self.transaction() as connection:
            topic = (
                connection.execute(
                    select(custom_topics).where(
                        custom_topics.c.UserId == user_id,
                        custom_topics.c.TopicId == topic_id,
                    )
                )
                .mappings()
                .first()
            )
            if not topic:
                raise HTTPException(404, "Vocabulary topic not found.")
            rows = (
                connection.execute(
                    select(custom_words)
                    .where(
                        custom_words.c.UserId == user_id,
                        custom_words.c.TopicId == topic_id,
                    )
                    .order_by(custom_words.c.Position)
                )
                .mappings()
                .all()
            )
            state_rows = (
                connection.execute(
                    select(word_states).where(
                        word_states.c.UserId == user_id,
                        word_states.c.TopicId == topic_id,
                    )
                )
                .mappings()
                .all()
            )
            states = {
                row["WordId"]: {
                    "remembered": bool(row["Remembered"]),
                    "version": int(row["Version"]),
                }
                for row in state_rows
            }
            return {
                "topic_id": topic["TopicId"],
                "title_vi": topic["TitleVi"],
                "title_en": topic["TitleEn"],
                "description": topic["Description"],
                "word_count": int(topic["WordCount"]),
                "review_status": topic["ReviewStatus"],
                "source": "custom",
                "created_at": topic["CreatedAt"].replace(tzinfo=UTC).isoformat(),
                "words": [
                    {
                        "id": row["WordId"],
                        "term": row["Term"],
                        "part_of_speech": row["PartOfSpeech"],
                        "ipa": row["Ipa"],
                        "meaning_vi": row["MeaningVi"],
                        "example_en": row["ExampleEn"],
                        "example_vi": row["ExampleVi"],
                        "cefr": row["Cefr"],
                        **states.get(
                            row["WordId"], {"remembered": False, "version": 0}
                        ),
                    }
                    for row in rows
                ],
            }

    def delete_topic(self, user_id: int, topic_id: str) -> None:
        """Hard-delete one owned topic and leave daily usage untouched."""
        with self.transaction(user_id) as connection:
            row = (
                connection.execute(
                    select(custom_topics.c.UserId).where(
                        custom_topics.c.TopicId == topic_id
                    )
                )
                .mappings()
                .first()
            )
            if row is not None and int(row["UserId"]) != user_id:
                raise HTTPException(404, "Vocabulary topic not found.")
            if row is None:
                return
            connection.execute(
                delete(custom_words).where(
                    custom_words.c.UserId == user_id,
                    custom_words.c.TopicId == topic_id,
                )
            )
            connection.execute(
                delete(word_states).where(
                    word_states.c.UserId == user_id,
                    word_states.c.TopicId == topic_id,
                )
            )
            connection.execute(
                delete(custom_topics).where(
                    custom_topics.c.UserId == user_id,
                    custom_topics.c.TopicId == topic_id,
                )
            )
            timestamp = now()
            connection.execute(
                update(generation_jobs)
                .where(
                    generation_jobs.c.UserId == user_id,
                    generation_jobs.c.TopicId == topic_id,
                )
                .values(
                    Status="deleted",
                    TopicId=None,
                    UpdatedAt=timestamp,
                    FinishedAt=timestamp,
                )
            )

    def _recover_user(self, user_id: int) -> int:
        """Recover expired jobs for one owner under that owner's write lock."""
        with self.transaction(user_id) as connection:
            count = connection.execute(
                select(func.count())
                .select_from(generation_jobs)
                .where(
                    generation_jobs.c.UserId == user_id,
                    generation_jobs.c.Status.in_(("pending", "running")),
                    generation_jobs.c.ExpiresAt <= now(),
                )
            ).scalar_one()
            self._expire_stale_in_connection(connection, user_id)
            return int(count)

    def recover_stale_jobs(self, user_id: int | None = None) -> int:
        """Best-effort startup/lazy recovery for work past its deadline."""
        if user_id is not None:
            return self._recover_user(user_id)
        condition = and_(
            generation_jobs.c.Status.in_(("pending", "running")),
            generation_jobs.c.ExpiresAt <= now(),
        )
        with self.transaction() as connection:
            user_ids = (
                connection.execute(
                    select(generation_jobs.c.UserId).where(condition).distinct()
                )
                .scalars()
                .all()
            )
        return sum(self._recover_user(int(owner)) for owner in user_ids)


__all__ = [
    "VocabularyGenerationError",
    "VocabularyGenerationService",
    "VocabularyJobManager",
    "batch_budget",
    "map_provider_error",
    "normalized_term",
    "parse_batch",
    "payload_hash",
    "public_job",
    "seconds_until_utc_midnight",
    "word_id",
]
