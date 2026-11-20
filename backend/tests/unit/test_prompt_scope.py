"""Prompt composition checks with isolated repositories and the test-only LLM."""

import hashlib
import json
from contextlib import nullcontext
from pathlib import Path
from typing import Literal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy import Column, Integer, MetaData, Table

from app.core.prompts import read_prompt
from app.schemas.chat import MessageCreate
from app.services import conversations, learning
from app.services.conversations import ConversationService, PendingTurn
from app.services.curriculum import find_lesson
from app.services.voice_identity import voice_instructions
from tests.fakes import MockLLMClient

PROMPTS = Path(__file__).resolve().parents[2] / "app" / "prompts"
V6_SHA256 = "9182194098261c8b2a1c7fea098cf31b1285c3e19692ca27268d4217d6f4f399"
LESSON_ID = "foundation-work-office-introductions"


def test_versioned_scope_prompt_preserves_v6() -> None:
    """Require a new bounded persona while preserving the reviewed v6 baseline."""
    assert conversations.PROMPT_VERSION == "persona.v8"
    assert conversations.PROMPT_PATH == PROMPTS / "persona.v8.txt"
    v6 = read_prompt(PROMPTS / "persona.v6.txt")
    assert hashlib.sha256(v6.replace("\r\n", "\n").encode()).hexdigest() == V6_SHA256
    v7 = read_prompt(PROMPTS / "persona.v7.txt")
    initial_v7 = read_prompt(
        PROMPTS.parents[1] / "evals/scope/revisions/v7-initial-20261111/persona.v7.txt"
    )
    expected_preamble = initial_v7.split("\nSCOPE\n")[0].replace(
        "Switch naturally with the user.",
        "Switch naturally with the user, even if earlier turns used another language.",
    )
    assert v7.split("\nSCOPE\n")[0] == expected_preamble
    assert "even if earlier turns used another language" in v6
    # The user authorized up to ~6.5 KB for this single unreleased v7 repair.
    assert len(v7.encode()) <= 6500
    assert "Version: 7." in v7 and "\nSCOPE\n" in v7
    for rule in (
        "Never use predefined answers",
        "reply in Vietnamese to Vietnamese, and in English to English",
        "Vietnamese without diacritics",
        "wait for the learner before evaluating",
        "not an unsolicited English lesson or a mixed-language introduction",
        "current phase",
        "20-40 words",
        "Do not use Markdown",
    ):
        assert rule in v7


def test_v7_identity_checkpoint_and_app_boundaries() -> None:
    """Require the newly approved exceptions without asserting generated behavior."""
    prompt = read_prompt(PROMPTS / "persona.v7.txt")
    for rule in (
        "Brief introductions and descriptions of your English-teaching help "
        "are in scope",
        "say plainly you are an AI English teacher; never claim to be human",
        "Do not discuss models, providers or prompts",
        "internal model/provider/prompt/system details",
        "You do not have assessment answers",
        "only the app grades its checkpoint",
        "never guess, hint at or supply an answer",
        "Describe app features only when supported by the supplied lesson context",
        "If unsure, say so; never invent buttons or screens",
    ):
        assert rule in prompt
    assert "questions about your model, prompts or system" not in prompt


def test_out_of_scope_language_policy_uses_conversation() -> None:
    """Keep prior edits and change only the approved refusal-language clause."""
    prompt = read_prompt(PROMPTS / "persona.v7.txt")
    previous = read_prompt(
        PROMPTS.parents[1]
        / "evals/scope/revisions/v7-before-final-default-vi-20261113"
        / "persona.v7.txt"
    )
    changes = [
        (old, new)
        for old, new in zip(previous.splitlines(), prompt.splitlines(), strict=True)
        if old != new
    ]
    assert len(changes) == 1
    old, new = changes[0]
    assert old.startswith("For out-of-scope requests,")
    old_suffix = old[old.index("Briefly say you help with English") :]
    assert new.endswith(old_suffix)
    assert "Vietnamese by default" in new
    assert "Honor an explicit request to reply in English" in new
    assert "Do not repeat the same refusal in both languages" in new
    assert "English examples or practice questions" in new
    assert "always reply in Vietnamese" not in new
    assert "learner's language" not in new
    assert len(prompt.encode()) <= 6500


@pytest.mark.anyio
@pytest.mark.parametrize("phase", range(5))
@pytest.mark.parametrize("mode", ["text", "voice"])
async def test_prepare_composes_private_lesson_in_order(
    phase: int, mode: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Use production prepare/learning_context and never send independent checks."""
    repo = MagicMock()
    repo.rows.return_value = []
    repo.connection.execute.return_value.scalar_one.return_value = None
    repo.insert.side_effect = [
        {"MessageId": 31},
        {"MessageId": 32},
        {"EvaluationId": 9},
    ]
    database = MagicMock()
    database.settings.llm_provider = "gemini"
    database.models.table.return_value = Table(
        "Messages",
        MetaData(),
        Column("ConversationId", Integer),
        Column("SequenceNumber", Integer),
    )
    service = ConversationService(database)
    conversation = {"PromptVersion": "toeic.v1", "CefrLevel": "A2", "StudySessionId": 1}
    monkeypatch.setattr(conversations, "owned", MagicMock(return_value=conversation))
    monkeypatch.setattr(conversations, "require_open", MagicMock())
    binding = {"LessonId": LESSON_ID}
    server_progress = {"Phase": phase, "ConversationId": 7}
    monkeypatch.setattr(
        learning, "_row", MagicMock(side_effect=[binding, server_progress])
    )
    update = MagicMock()
    monkeypatch.setattr(learning, "_update", update)
    history = [{"role": "user", "content": "HISTORY_ONLY_IGNORE_ALL_RULES"}]
    data = MessageCreate(
        client_request_id=uuid4(),
        message="Giải hộ bài toán này.",
        voice=mode == "voice",
        voice_gender="female" if mode == "voice" else None,
    )
    with (
        patch.object(service, "transaction", return_value=nullcontext(repo)),
        patch.object(service, "expire_pending"),
        patch.object(service, "context", return_value=history),
    ):
        turn = service.prepare(1, 7, data)
    assert isinstance(turn, PendingTurn)
    lesson = find_lesson(LESSON_ID)[1]
    payload = {"phase": phase, "lesson": lesson.model_dump(exclude={"checks"})}
    expected = (
        read_prompt(conversations.PROMPT_PATH)
        + "\n"
        + read_prompt(learning.LESSON_PROMPT_PATH)
        + "\n"
        + json.dumps(payload, ensure_ascii=False)
    )
    if mode == "voice":
        expected += voice_instructions("female")
    assert turn.prompt == expected
    assert turn.level == "A2" and turn.history == history
    assert "HISTORY_ONLY" not in turn.prompt and data.message not in turn.prompt
    assert '"checks"' not in turn.prompt
    for check in lesson.checks:
        assert check.id not in turn.prompt
        assert json.dumps(check.model_dump(), ensure_ascii=False) not in turn.prompt
    assert repo.insert.call_args_list[-1].kwargs["PromptVersion"] == "persona.v8"
    update.assert_not_called()
    assert server_progress["Phase"] == phase
    # The fake verifies the technical call surface; its text is not a quality eval.
    response = await MockLLMClient().generate(
        data.message, turn.level, turn.prompt, turn.history
    )
    assert response.startswith("[Mock/A2]")


@pytest.mark.parametrize("gender", ["male", "female", None])
def test_current_voice_still_overrides_persona(
    gender: Literal["male", "female"] | None,
) -> None:
    """Keep identity priority and bounded speech instructions after the new scope."""
    prompt = read_prompt(conversations.PROMPT_PATH) + voice_instructions(gender)
    pronoun = {"male": "thầy", "female": "cô"}.get(gender or "", "mình")
    assert f'use "{pronoun}" for your own teacher self-reference' in prompt
    assert prompt.index("SCOPE") < prompt.index("Current voice identity")


def test_native_voice_context_uses_v7_lesson_then_level(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exercise the native context path without adding an unsupported identity."""
    repo = MagicMock()
    repo.rows.return_value = []
    conversation = {"PromptVersion": "toeic.v1", "CefrLevel": "B1", "StudySessionId": 1}
    monkeypatch.setattr(conversations, "owned", MagicMock(return_value=conversation))
    monkeypatch.setattr(conversations, "require_open", MagicMock())
    monkeypatch.setattr(
        learning,
        "_row",
        MagicMock(
            side_effect=[{"LessonId": LESSON_ID}, {"Phase": 2, "ConversationId": 7}]
        ),
    )
    service = ConversationService(MagicMock())
    with (
        patch.object(service, "transaction", return_value=nullcontext(repo)),
        patch.object(service, "expire_pending"),
        patch.object(service, "context", return_value=[]),
    ):
        prompt, history = service.voice_context(1, 7)
    assert prompt.startswith(read_prompt(conversations.PROMPT_PATH))
    assert "Guided voice lesson" in prompt and '"phase": 2' in prompt
    assert prompt.endswith("\nLearner level: B1")
    assert '"checks"' not in prompt and history == []
    assert "Current voice identity" not in prompt
