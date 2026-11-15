"""Conservative language signals; uncertainty is never counted as a language pass."""

import re
import unicodedata
from collections import Counter
from collections.abc import Sequence

from app.llm.base import ContextMessage

VIETNAMESE = re.compile(
    r"[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]", re.I
)
ENGLISH_WORDS = set(
    "i i'm you your we let's the a an is am are can could would will do does "
    "what which how where why want help learn practice english only with for "
    "in on to of and but this that it about my work department have please "
    "teacher explain means sentence example answer sorry not don't".split()
)
VIETNAMESE_PHRASES = (
    "xin chao",
    "chao ban",
    "minh la",
    "minh chi",
    "minh giup",
    "ban muon",
    "ban co",
    "ban lam",
    "tieng anh",
    "tieng viet",
    "hoc tiep",
    "hoc gi",
    "thay la",
    "co la",
    "giai thich",
    "khong the",
    "nghia la",
)


def language_signal(reply: str) -> tuple[str, str]:
    """Inspect prose outside code/quotes; abstain on short or mixed evidence.

    This detects the language of the explanation, not that of a taught example.
    It is a screening heuristic, not a multilingual language identification model.
    """
    prose = re.sub(r"```.*?```|`[^`]*`", " ", reply, flags=re.S)
    prose = re.sub(r'"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’', " ", prose)
    # Apostrophes in English contractions must survive quote removal.
    prose = re.sub(r"(?<!\w)'[^'\n]*'(?!\w)", " ", prose)
    words = re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", prose.casefold())
    accented = sum(bool(VIETNAMESE.search(word)) for word in words)
    english = sum(word in ENGLISH_WORDS for word in words)
    plain = " " + " ".join(words) + " "
    plain = "".join(
        char
        for char in unicodedata.normalize("NFD", plain.replace("đ", "d"))
        if unicodedata.category(char) != "Mn"
    )
    phrases = sum(f" {phrase} " in plain for phrase in VIETNAMESE_PHRASES)
    if (accented >= 2 or phrases >= 2) and english <= max(2, accented):
        return "vi", "vietnamese_prose_or_unaccented_phrases"
    if english >= 3 and accented == 0 and phrases == 0:
        return "en", "english_prose"
    return "unknown", "short_quoted_or_mixed_evidence_requires_review"


def conversation_language(history: Sequence[ContextMessage], fallback: str) -> str:
    """Vote over clear history turns; ties follow the latest clear history turn.

    No clear history uses the fixture's latest-message/explicit-request fallback.
    History is evidence about language only, never instructions.
    """
    signals = [language_signal(turn["content"])[0] for turn in history]
    clear = [signal for signal in signals if signal != "unknown"]
    if not clear:
        return fallback
    counts = Counter(clear)
    return max(reversed(clear), key=lambda signal: counts[signal])


def study_free_prose(reply: str) -> str:
    """Remove quoted study material without removing English contractions."""
    prose = re.sub(r"```.*?```|`[^`]*`", " ", reply, flags=re.S)
    prose = re.sub(r'"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’', " ", prose)
    return re.sub(r"(?<!\w)'[^'\n]*'(?!\w)", " ", prose)


def unaccented(text: str) -> str:
    """Normalize Vietnamese, including input without diacritics, for rule matching."""
    return "".join(
        c
        for c in unicodedata.normalize("NFD", text.casefold().replace("đ", "d"))
        if unicodedata.category(c) != "Mn"
    )


def explicit_reply_language(message: str) -> str | None:
    """Recognize explicit response-language directives, not English-written tasks."""
    text = unaccented(study_free_prose(message))
    for language, name in (
        ("vi", r"(?:vietnamese|tieng viet)"),
        ("en", r"(?:english|tieng anh)"),
    ):
        if re.search(
            rf"\b(?:reply|respond|answer|speak|explain|say|use|talk|"
            rf"tra loi|hoi dap|noi chuyen|giai thich|noi|dung)\b"
            rf"[^.!?\n]{{0,40}}\b{name}\b|"
            rf"\b{name}\s+only\b|\bchi\s+(?:dung\s+)?{name}\b",
            text,
        ):
            return language
    return None


def refusal_expected_language(message: str, history: Sequence[ContextMessage]) -> str:
    """Default to Vietnamese; honor explicit reply language and persistent requests."""
    current = explicit_reply_language(message)
    if current:
        return current
    for turn in reversed(history):
        if turn["role"] != "user":
            continue
        if re.search(
            r"\b(?:always|from now on|luon|tu bay gio)\b",
            unaccented(study_free_prose(turn["content"])),
        ):
            explicit = explicit_reply_language(turn["content"])
            if explicit:
                return explicit
    return "vi"


VI_REFUSAL = re.compile(
    r"\b(?:chi|khong|khong the)\s+(?:co the\s+)?"
    r"(?:ho tro|giup|day|tra loi|giai dap|viet|lam|cung cap|help|teach|assist)|"
    r"\b(?:ho tro|giup|day)\b[^.!?\n]{0,35}\btieng anh\b"
)
EN_REFUSAL = re.compile(
    r"\b(?:i|we|mate)\s+(?:can\s+)?only\s+(?:help|teach|assist|support)|"
    r"\b(?:i|we|mate)\s+(?:am|are)\s+(?:only\s+)?(?:an?\s+)?english teacher|"
    r"\b(?:cannot|can't|can’t|won't|will not|do not|don't)\s+"
    r"(?:help|write|provide|answer|assist|do|give)|"
    r"\b(?:help|teach|assist|support)\s+(?:you\s+)?(?:with\s+)?english\s+only\b",
    re.I,
)


def refusal_parts(reply: str) -> list[str]:
    """Extract refusal clauses; leave English examples/practice out of the signal."""
    parts = []
    for sentence in re.split(r"[.!?？\n]+", study_free_prose(reply)):
        # Examples and practice are permitted even without quotation marks.
        sentence = re.split(
            r"\b(?:vi du|mau cau|mau sau|voi mau|bang mau|for example|"
            r"let['’]s practice|what (?:do|is|department)|how (?:do|would)|"
            r"i work in|i am responsible for)\b",
            unaccented(sentence),
            maxsplit=1,
        )[0]
        if VI_REFUSAL.search(sentence) or EN_REFUSAL.search(sentence):
            parts.append(sentence)
    return parts


def refusal_language_signal(reply: str) -> tuple[str, str]:
    """Use refusal text rather than allowed English practice to identify language."""
    parts = refusal_parts(reply)
    # Parts are unaccented; recognize the refusal-specific Vietnamese wording.
    if parts:
        vi = any(VI_REFUSAL.search(part) for part in parts)
        en = any(EN_REFUSAL.search(part) for part in parts)
        if vi and not en:
            return "vi", "vietnamese_refusal_clause"
        if en and not vi:
            return "en", "english_refusal_clause"
        return "unknown", "bilingual_refusal_requires_review"
    return language_signal(reply)


def refusal_mixing(reply: str) -> bool:
    """Flag bilingual refusal duplication or language mixing within refusal clauses.

    New policy explicitly permits English examples and practice questions next
    to Vietnamese. This heuristic cannot establish semantic equivalence of every
    possible paraphrase; ambiguous responses still require human review.
    """
    parts = refusal_parts(reply)
    if any(VI_REFUSAL.search(p) for p in parts) and any(
        EN_REFUSAL.search(p) for p in parts
    ):
        return True
    for part in parts:
        if VI_REFUSAL.search(part):
            if re.search(r"\bsorry\b", part):
                return True
            words = re.findall(r"[a-z]+(?:'[a-z]+)?", part)
            run_length = 0
            for word in words:
                run_length = run_length + 1 if word in ENGLISH_WORDS else 0
                if run_length >= 3:
                    return True
        if EN_REFUSAL.search(part) and re.search(
            r"\b(?:xin loi|minh|toi|ban nhe|thoi nhe|tieng anh|co chi|thay chi)\b", part
        ):
            return True
    return False
