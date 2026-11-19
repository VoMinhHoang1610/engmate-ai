"""Strict authored vocabulary and account-owned self-assessment contracts."""

import re
import unicodedata
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def plain_text(value: str) -> str:
    """Keep generated content plain text; reject hidden controls and markup."""
    if value != value.strip() or any(
        unicodedata.category(char).startswith("C") or char in "<>" for char in value
    ):
        raise ValueError("Expected trimmed plain text without controls")
    return unicodedata.normalize("NFC", value)


INJECTION_MARKERS = (
    "ignore previous",
    "ignore all previous",
    "ignore the previous",
    "system prompt",
    "developer message",
    "you are now",
    "jailbreak",
    "disregard",
    "follow these instructions",
    "bỏ qua hướng dẫn",
    "bỏ qua mọi hướng dẫn",
    "lời nhắc hệ thống",
    "từ bây giờ bạn là",
)


def clean_topic(value: str) -> str:
    """Normalize a user topic and reject controls, markup and prompt steering."""
    topic = unicodedata.normalize("NFC", value)
    topic = " ".join(topic.split())
    if not 2 <= len(topic) <= 80:
        raise ValueError("Topic must contain 2 to 80 characters")
    if any(
        unicodedata.category(char).startswith("C") or char in "<>{}`" for char in topic
    ):
        raise ValueError("Topic must be plain text without controls or markup")
    lowered = topic.casefold()
    if any(marker in lowered for marker in INJECTION_MARKERS):
        raise ValueError("Topic contains a prompt-control phrase")
    if re.search(r"(?:https?://|www\.|\S+@\S+\.\S+)", topic, re.IGNORECASE):
        raise ValueError("Topic must not contain links or email addresses")
    return topic


class VocabularyInput(BaseModel):
    """Reject unexpected owner fields and implicit value coercion."""

    model_config = ConfigDict(extra="forbid")


class Word(VocabularyInput):
    """One independently reviewable meaning, example and British IPA."""

    id: str = Field(pattern=r"^[a-z0-9-]{1,80}$")
    term: str = Field(min_length=1, max_length=80)
    part_of_speech: Literal["noun", "verb", "adjective", "adverb", "phrase"]
    ipa: str = Field(min_length=3, max_length=120, pattern=r"^/[^/]+/$")
    meaning_vi: str = Field(min_length=2, max_length=180)
    example_en: str = Field(min_length=5, max_length=220)
    example_vi: str = Field(min_length=5, max_length=260)
    cefr: Literal["A1", "A2", "B1", "B2", "C1", "C2"]

    @field_validator("term", "ipa", "meaning_vi", "example_en", "example_vi")
    @classmethod
    def plain_content(cls, value: str) -> str:
        """Keep content plain text; reject hidden controls and markup."""
        return plain_text(value)

    @model_validator(mode="after")
    def example_contains_term(self) -> Self:
        """Require a whole term, not an accidental substring of another word."""
        if not re.search(
            r"(?<!\w)" + re.escape(self.term) + r"(?!\w)",
            self.example_en,
            re.IGNORECASE,
        ):
            raise ValueError("Example must contain the complete term")
        if not all(
            any(ord(char) > 127 for char in value)
            for value in (self.meaning_vi, self.example_vi)
        ):
            raise ValueError("Vietnamese text requires manual language review")
        return self

    @field_validator("ipa")
    @classmethod
    def ipa_symbols(cls, value: str) -> str:
        """Screen IPA symbols; phonetic correctness still requires human review."""
        if any(
            not (
                "a" <= char <= "z"
                or "\u0250" <= char <= "\u02ff"
                # English IPA also uses letters from the Latin Unicode blocks.
                or char in "æŋð/ .()"
            )
            for char in value
        ):
            raise ValueError("Unexpected IPA symbol")
        return value


class Topic(VocabularyInput):
    """A complete authored topic, never a partial generated batch."""

    id: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    title_vi: str = Field(min_length=2, max_length=100)
    title_en: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=5, max_length=240)
    icon: Literal["coffee", "briefcase"]
    words: list[Word] = Field(min_length=50, max_length=50)

    @model_validator(mode="after")
    def unique_words(self) -> Self:
        """Prevent duplicate IDs or normalized terms within a topic."""
        if len({word.id for word in self.words}) != len(self.words) or len(
            {" ".join(word.term.casefold().split()) for word in self.words}
        ) != len(self.words):
            raise ValueError("Duplicate word ID or term")
        return self


class VocabularyCatalog(VocabularyInput):
    """Version the content and make its review status explicit."""

    version: Literal["vocabulary.v1"]
    accent: Literal["en-GB"]
    review_status: Literal["ai_authored_unreviewed"]
    topics: list[Topic] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_topics(self) -> Self:
        """Reject ambiguous topic identifiers at load time."""
        if len({topic.id for topic in self.topics}) != len(self.topics):
            raise ValueError("Duplicate topic ID")
        return self


class WordStateUpdate(VocabularyInput):
    """Set a value with optimistic versioning and a durable retry identity."""

    client_request_id: UUID
    remembered: bool = Field(strict=True)
    version: int = Field(ge=0, strict=True)


class LegacyImport(VocabularyInput):
    """Only known legacy keys can be imported, never scores or an owner."""

    client_request_id: UUID
    remembered_keys: list[Annotated[str, Field(min_length=1, max_length=120)]] = Field(
        max_length=12
    )


class GenerationCreate(VocabularyInput):
    """Request a private generated topic without claiming an owner or title."""

    client_request_id: UUID
    topic: str = Field(min_length=2, max_length=200)
    target_count: Literal[30, 60] = 30

    @field_validator("topic")
    @classmethod
    def sanitized_topic(cls, value: str) -> str:
        """Normalize and screen untrusted topic text before any persistence."""
        return clean_topic(value)


class GeneratedWord(VocabularyInput):
    """One model-produced word; the server assigns its stable ID."""

    term: str = Field(min_length=1, max_length=80)
    part_of_speech: Literal["noun", "verb", "adjective", "adverb", "phrase"]
    ipa: str = Field(min_length=3, max_length=120, pattern=r"^/[^/]+/$")
    meaning_vi: str = Field(min_length=2, max_length=180)
    example_en: str = Field(min_length=5, max_length=220)
    example_vi: str = Field(min_length=5, max_length=260)
    cefr: Literal["A1", "A2", "B1", "B2", "C1", "C2"]


class GeneratedTopic(VocabularyInput):
    """Display metadata must come from validated generated output."""

    title_vi: str = Field(min_length=2, max_length=60)
    title_en: str = Field(min_length=2, max_length=60)
    description: str = Field(min_length=5, max_length=240)

    @field_validator("title_vi", "title_en")
    @classmethod
    def clean_title(cls, value: str) -> str:
        """Apply the user-topic sanitizer so generated titles are inert text."""
        return clean_topic(value)

    @field_validator("description")
    @classmethod
    def plain_description(cls, value: str) -> str:
        """Keep generated descriptions trimmed plain text."""
        return plain_text(value)


class GeneratedBatch(VocabularyInput):
    """Strict provider envelope; malformed or partial batches are recoverable."""

    status: Literal["ok", "refused", "needs_clarification"]
    topic: GeneratedTopic | None = None
    words: list[GeneratedWord] = Field(default_factory=list, max_length=6)
    reason_code: str | None = Field(default=None, max_length=40)
    suggestions: list[str] = Field(default_factory=list, max_length=3)


class GenerationJobResponse(VocabularyInput):
    """Stable polling contract; never includes the submitted topic or raw output."""

    request_id: str
    status: Literal[
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
        "deleted",
    ]
    target_count: int
    validated_count: int
    batch_size: int
    poll_after_ms: int
    topic_id: str | None = None
    error_code: str | None = None
    retry_after: int | None = None
