"""Cache immutable versioned prompt files within the running application."""

from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=8)
def read_prompt(path: Path) -> str:
    """Reload on process restart/version change, never cache user-authored content."""
    return path.read_text(encoding="utf-8")
