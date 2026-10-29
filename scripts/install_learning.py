"""Install only additive EngMate course tables, never migrate legacy account data.

Run `.venv/Scripts/python.exe scripts/install_learning.py` from the project root
for the configured development database. Pass `--test` to use MYSQL_TEST_URL;
that URL must name an isolated database ending in `_test`. Existing tables are
left in place by SQLAlchemy create_all(checkfirst=True). No DROP, UPDATE, seed
accounts or modification of existing application tables is performed.
"""

import argparse
import os
import sys
from pathlib import Path

from pydantic import SecretStr
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

# Direct script execution adds scripts/, rather than backend/, to sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import Settings, get_settings
from app.db.database import Database
from app.db.learning import metadata


def main() -> None:
    """Explicitly add the four course tables to the selected dev/test schema."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args()
    if args.test:
        configured = os.environ.get("MYSQL_TEST_URL", "")
        url = make_url(configured)
        if not url.database or not url.database.endswith("_test"):
            raise ValueError("MYSQL_TEST_URL must use an isolated _test database.")
        settings = Settings(
            database_mysql_url=SecretStr(configured),
            jwt_secret=SecretStr("installer-only-not-used-for-account-signing"),
        )
        engine = create_engine(url, hide_parameters=True)
    else:
        settings = get_settings()
        engine = Database(settings).get_engine()
    with engine.begin() as connection:
        metadata.create_all(connection, checkfirst=True)
    engine.dispose()
    print("Learning tables installed: " + ", ".join(sorted(metadata.tables)))


if __name__ == "__main__":
    main()
