"""Browse authored JSON and save explicit, account-owned word self-assessments."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.api.chat_routes import User
from app.db.database import Record
from app.schemas.vocabulary import LegacyImport, Topic, WordStateUpdate
from app.services.vocabulary import VocabularyService
from app.services.vocabulary_catalog import vocabulary_catalog, vocabulary_topic

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])


def vocabulary_service(request: Request) -> VocabularyService:
    """Resolve the existing database; RequestLimits supplies no-store headers."""
    return VocabularyService(request.app.state.database)


Vocabulary = Annotated[VocabularyService, Depends(vocabulary_service)]


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
