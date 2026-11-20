"""Author, generate and study account-owned vocabulary topics."""

import asyncio
from typing import Annotated, cast

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.concurrency import run_in_threadpool

from app.api.chat_routes import User
from app.api.dependencies import get_llm_client
from app.db.database import Record
from app.llm.base import LLMClient
from app.schemas.vocabulary import (
    GenerationCreate,
    GenerationJobResponse,
    LegacyImport,
    Topic,
    WordStateUpdate,
)
from app.services.vocabulary import VocabularyService
from app.services.vocabulary_catalog import vocabulary_catalog, vocabulary_topic
from app.services.vocabulary_generation import VocabularyGenerationService

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])


def vocabulary_service(request: Request) -> VocabularyService:
    """Resolve the existing database; RequestLimits supplies no-store headers."""
    return VocabularyService(request.app.state.database)


def generation_service(request: Request) -> VocabularyGenerationService:
    """Share one quota/job manager for the process, never per request."""
    return cast(VocabularyGenerationService, request.app.state.vocabulary_generation)


def generation_ready(
    service: Annotated[VocabularyGenerationService, Depends(generation_service)],
) -> None:
    """Reject an unsupported provider configuration before any paid work."""
    service.require_supported()


Vocabulary = Annotated[VocabularyService, Depends(vocabulary_service)]
Generation = Annotated[VocabularyGenerationService, Depends(generation_service)]
GenerationReady = Annotated[None, Depends(generation_ready)]
AI = Annotated[LLMClient, Depends(get_llm_client)]


@router.get("/topics")
def topics(user: User) -> Record:
    """List complete authored topics without consulting vocabulary SQL tables."""
    catalog = vocabulary_catalog()
    return {
        "version": catalog.version,
        "accent": catalog.accent,
        "review_status": catalog.review_status,
        "topics": [
            {
                **topic.model_dump(exclude={"words"}),
                "word_count": len(topic.words),
                "levels": sorted({word.cefr for word in topic.words}),
            }
            for topic in catalog.topics
        ],
    }


@router.get("/topics/{topic_id}", response_model=Topic)
def topic(topic_id: str, user: User) -> Topic:
    """Return all fifty words, with no implicit profile-level filtering."""
    return vocabulary_topic(topic_id)


@router.post("/generations", status_code=202, response_model=GenerationJobResponse)
async def start_generation(
    data: GenerationCreate,
    user: User,
    ready: GenerationReady,
    service: Generation,
    client: AI,
    response: Response,
) -> Record:
    """Replay or reserve a job; the raw topic stays only in this process."""
    job, created = await run_in_threadpool(service.prepare_start, user, data)
    if not created:
        response.status_code = 200
        return job
    user_id = int(user["UserId"])
    request_id = str(data.client_request_id)
    task = asyncio.create_task(service.run_job(user_id, request_id, data.topic, client))
    service.jobs.track(user_id, request_id, task)
    task.add_done_callback(lambda _: service.jobs.forget(user_id, request_id))
    return job


@router.get("/generations/{request_id}", response_model=GenerationJobResponse)
def generation(request_id: str, user: User, service: Generation) -> Record:
    """Poll one owned job; a stale job is recovered before it is returned."""
    return service.job(user["UserId"], request_id)


@router.post("/generations/{request_id}/cancel", response_model=GenerationJobResponse)
async def cancel_generation(request_id: str, user: User, service: Generation) -> Record:
    """Cancel durably first, then stop the local task; terminal is a no-op."""
    job = await run_in_threadpool(service.cancel, user["UserId"], request_id)
    service.jobs.cancel(user["UserId"], request_id)
    return job


@router.get("/me/topics")
def custom_topics(
    user: User,
    service: Generation,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> Record:
    """Return only the owner's topics, active jobs and daily quota."""
    return service.topics(user["UserId"], offset, limit)


@router.get("/me/topics/{topic_id}")
def custom_topic(topic_id: str, user: User, service: Generation) -> Record:
    """Return one owner topic and every word/state; others are 404."""
    return service.topic_detail(user["UserId"], topic_id)


@router.delete("/me/topics/{topic_id}", status_code=204)
def delete_custom_topic(topic_id: str, user: User, service: Generation) -> Response:
    """Hard-delete topic data without lowering any usage counter."""
    service.delete_topic(user["UserId"], topic_id)
    return Response(status_code=204)


@router.get("/me/states")
def states(user: User, service: Vocabulary) -> Record:
    """Read state independently from the authored content source."""
    return service.states(user["UserId"])


@router.put("/topics/{topic_id}/words/{word_id}/state")
def save_state(
    topic_id: str,
    word_id: str,
    data: WordStateUpdate,
    user: User,
    service: Vocabulary,
) -> Record:
    """The session, never the body, determines ownership."""
    return service.save(user["UserId"], topic_id, word_id, data)


@router.post("/me/import-legacy")
def import_legacy(data: LegacyImport, user: User, service: Vocabulary) -> Record:
    """Accept a confirmed whitelist-only import with a durable receipt."""
    return service.import_legacy(user["UserId"], data)


__all__ = ["router"]
