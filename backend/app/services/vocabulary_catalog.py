"""Read validated static vocabulary without querying vocabulary SQL tables."""

from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from app.schemas.vocabulary import Topic, VocabularyCatalog

CONTENT_PATH = Path(__file__).resolve().parents[1] / "content" / "vocabulary.v1.json"
LEGACY_KEYS = {
    f"{topic}:{term}": (f"legacy-{topic}", f"word-{index}")
    for topic, terms in (
        ("introduce", ("I’m…", "Nice to meet you", "How about you?")),
        ("cafe", ("I’d like…", "What size…?", "Take away")),
        ("travel", ("Turn left", "Go straight", "Station")),
        ("work", ("Usually", "Team", "Schedule")),
    )
    for index, term in enumerate(terms, 1)
}


@lru_cache(maxsize=1)
def vocabulary_catalog() -> VocabularyCatalog:
    """Validate the entire versioned resource before exposing any topic."""
    return VocabularyCatalog.model_validate_json(
        CONTENT_PATH.read_text(encoding="utf-8")
    )


def vocabulary_topic(topic_id: str) -> Topic:
    """Resolve public authored IDs without accepting paths from the client."""
    for topic in vocabulary_catalog().topics:
        if topic.id == topic_id:
            return topic
    raise HTTPException(404, "Vocabulary topic not found.")


def require_word(topic_id: str, word_id: str) -> None:
    """Allow only authored words or explicitly mapped legacy phrases."""
    if (topic_id, word_id) in LEGACY_KEYS.values():
        return
    if not any(word.id == word_id for word in vocabulary_topic(topic_id).words):
        raise HTTPException(404, "Vocabulary word not found.")
