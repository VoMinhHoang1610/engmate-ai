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


def refusal_mixing(reply: str) -> bool:
    """Flag bilingual refusal prose while allowing clearly quoted study examples.

    Sentence/colon segments catch separate clauses. A run of three common
    English words catches unpunctuated English clauses inside Vietnamese prose.
    This conservative screen does not claim semantic assessment.
    """
    prose = re.sub(r"```.*?```|`[^`]*`", " ", reply, flags=re.S)
    prose = re.sub(r'"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’', " ", prose)
    prose = re.sub(r"(?<!\w)'[^'\n]*'(?!\w)", " ", prose)
    signals = {
        language_signal(segment)[0] for segment in re.split(r"[.!?？\n:;]+", prose)
    }
    words = re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", prose.casefold())
    run_length = 0
    english_clause = bool(
        re.search(r"\blet['’]s\s+(?:practice|learn|try)\b", prose, re.I)
    )
    for word in words:
        run_length = run_length + 1 if word in ENGLISH_WORDS else 0
        english_clause |= run_length >= 3
    vietnamese = "vi" in signals or bool(VIETNAMESE.search(prose))
    return vietnamese and ("en" in signals or english_clause)
