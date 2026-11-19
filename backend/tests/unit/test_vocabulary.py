"""Authored content and unavailable-table behavior without a paid provider."""

from copy import deepcopy
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError

from app.api.chat_routes import current_user
from app.core.config import Settings
from app.db.database import Database
from app.main import create_app
from app.schemas.vocabulary import VocabularyCatalog, Word, WordStateUpdate
from app.services.vocabulary_catalog import LEGACY_KEYS, vocabulary_catalog


def test_authored_topics_are_complete_and_reviewable() -> None:
    """The first slice must expose exactly two complete, individually typed topics."""
    catalog = vocabulary_catalog()
    assert [topic.id for topic in catalog.topics] == [
        "food-and-drink",
        "office-and-work",
    ]
    assert [len(topic.words) for topic in catalog.topics] == [50, 50]
    assert catalog.accent == "en-GB"
    assert catalog.review_status == "ai_authored_unreviewed"
    assert len(LEGACY_KEYS) == len(set(LEGACY_KEYS.values())) == 12


@pytest.mark.parametrize(
    "change",
    ["missing", "duplicate", "substring", "markup", "ipa", "extra", "language"],
)
def test_catalog_rejects_partial_or_unreviewable_content(change: str) -> None:
    """Do not silently publish incomplete lists or malformed learning cards."""
    data = deepcopy(vocabulary_catalog().model_dump())
    words = data["topics"][0]["words"]
    if change == "missing":
        words.pop()
    elif change == "duplicate":
        words[1] = words[0]
    elif change == "substring":
        words[0]["example_en"] = "I like pineapple."
    elif change == "markup":
        words[0]["meaning_vi"] = "<b>quả táo</b>"
    elif change == "ipa":
        words[0]["ipa"] = "/123/"
    elif change == "extra":
        words[0]["answer_key"] = "hidden"
    else:
        words[0]["example_vi"] = "This is not a Vietnamese example."
    with pytest.raises(ValidationError):
        VocabularyCatalog.model_validate(data)


@pytest.mark.parametrize("ipa", ["/ˈæpəl/", "/ˈmiːtɪŋ/", "/ðə/"])
def test_english_ipa_accepts_latin_block_phonetic_letters(ipa: str) -> None:
    """Valid English phonemes are not all in the IPA Extensions Unicode block."""
    data = {
        "id": "sample",
        "term": "sample",
        "part_of_speech": "noun",
        "ipa": ipa,
        "meaning_vi": "mẫu thử",
        "example_en": "This is a sample.",
        "example_vi": "Đây là một mẫu thử.",
        "cefr": "B1",
    }
    assert Word.model_validate(data).ipa == ipa


@pytest.mark.parametrize("ipa", ["/123/", "/æ🙂/", "/ŋ<b>/", "/æ\u200b/", "/ŋ\n/"])
def test_ipa_rejects_nonphonetic_text_and_hidden_controls(ipa: str) -> None:
    """Accepting Latin IPA letters must not admit digits, markup or controls."""
    data = vocabulary_catalog().topics[0].words[0].model_dump()
    data["ipa"] = ipa
    with pytest.raises(ValidationError):
        Word.model_validate(data)


def test_state_contract_rejects_owner_injection_and_boolean_versions() -> None:
    """The caller cannot claim another owner or coerce unsafe state values."""
    with pytest.raises(ValidationError):
        WordStateUpdate.model_validate(
            {
                "client_request_id": "e1470000-0000-4000-8000-000000000000",
                "remembered": "true",
                "version": True,
                "user_id": 2,
            }
        )


@pytest.mark.parametrize(
    ("code", "missing_table", "expected_code"),
    [
        (1146, "engmate_vocabulary_word_states", "vocabulary_not_installed"),
        (1146, "engmate_vocabulary_requests", "vocabulary_not_installed"),
        (1146, "engmate_vocabulary_custom_topics", "vocabulary_not_installed"),
        (1146, "engmate_vocabulary_custom_words", "vocabulary_not_installed"),
        (1146, "engmate_vocabulary_generation_jobs", "vocabulary_not_installed"),
        (1146, "engmate_vocabulary_usage", "vocabulary_not_installed"),
        (1146, "NguoiDung", None),
        (1146, "engmate_vocabulary_word_states_other", None),
        (1045, "engmate_vocabulary_word_states", None),
        (2003, "engmate_vocabulary_word_states", None),
    ],
)
def test_missing_vocabulary_tables_do_not_break_catalog_or_other_routes(
    code: int, missing_table: str, expected_code: str | None
) -> None:
    """Only the exact missing new table means not installed; other DB errors differ."""
    database = MagicMock(spec=Database)
    database.mysql = True
    database.transaction.side_effect = OperationalError(
        "SELECT",
        {},
        Exception(code, f"Table 'isolated_test.{missing_table}' doesn't exist"),
    )
    app = create_app(Settings(), database)
    app.dependency_overrides[current_user] = lambda: {"UserId": 1}
    client = TestClient(app)
    listing = client.get("/api/vocabulary/topics")
    assert listing.status_code == 200
    assert [topic["word_count"] for topic in listing.json()["topics"]] == [50, 50]
    assert listing.headers["cache-control"] == "no-store"
    assert (
        len(client.get("/api/vocabulary/topics/food-and-drink").json()["words"]) == 50
    )
    failed = client.get("/api/vocabulary/me/states")
    assert failed.status_code == 503
    detail = failed.json()["detail"]
    if expected_code:
        assert detail == {"code": expected_code}
    else:
        assert isinstance(detail, str)
        assert "unavailable" in detail.lower()
    assert client.get("/api/vocabulary/topics/office-and-work").status_code == 200
    assert client.get("/api/learning/catalog").status_code == 200


def test_catalog_requires_session_and_unknown_ids_are_not_paths() -> None:
    """Use existing session authorization for all vocabulary endpoints."""
    app = create_app(Settings())
    client = TestClient(app)
    assert client.get("/api/vocabulary/topics").status_code == 401
    app.dependency_overrides[current_user] = lambda: {"UserId": 1}
    assert client.get("/api/vocabulary/topics/not-a-topic").status_code == 404
    failed = client.get("/api/vocabulary/me/states")
    assert failed.status_code == 503
    assert failed.json()["detail"]["code"] == "vocabulary_mysql_required"
