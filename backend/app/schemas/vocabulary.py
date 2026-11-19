"""Strict authored vocabulary and account-owned self-assessment contracts."""

import re
import unicodedata
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


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
    def plain_text(cls, value: str) -> str:
        """Keep content plain text; reject hidden controls and markup."""
        if value != value.strip() or any(
            unicodedata.category(char).startswith("C") or char in "<>" for char in value
        ):
            raise ValueError("Expected trimmed plain text without controls")
        return unicodedata.normalize("NFC", value)

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
