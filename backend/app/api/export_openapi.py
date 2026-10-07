"""Export reproducible API documentation without connecting to a database."""

import json
from pathlib import Path

from app.core.config import Settings
from app.main import create_app


def main() -> None:
    """Write an importable OpenAPI artifact for Postman and typed-client generators."""
    root = Path(__file__).resolve().parents[3]
    target = root / ".artifacts" / "api" / "openapi.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(create_app(Settings()).openapi(), ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(f"OpenAPI exported to {target}")


if __name__ == "__main__":
    main()
