"""Explicitly add the social identity table without changing existing account data."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings
from app.db.database import Database
from app.db.oauth import metadata


def main() -> None:
    """Install only the additive binding table in the configured dev database."""
    argparse.ArgumentParser(description=__doc__).parse_args()
    database = Database(get_settings())
    try:
        with database.get_engine().begin() as connection:
            metadata.create_all(connection, checkfirst=True)
    finally:
        database.close()
    print("OAuth identity table installed; existing accounts were not changed.")


if __name__ == "__main__":
    main()
