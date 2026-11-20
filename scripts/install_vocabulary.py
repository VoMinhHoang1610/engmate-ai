"""Explicitly add authored/generated vocabulary tables; never alter old tables."""

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings
from app.db.vocabulary import metadata


def main() -> None:
    """Support a loopback-only test target or an explicitly configured MySQL DB."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args()
    if args.test:
        url = make_url(os.environ.get("MYSQL_TEST_URL", ""))
        if (
            url.get_backend_name() != "mysql"
            or url.host not in {"localhost", "127.0.0.1", "::1"}
            or not url.database
            or not url.database.endswith("_test")
            or not url.username
            or url.username == "root"
        ):
            raise ValueError("Use a loopback MySQL _test schema and a dedicated user.")
    else:
        configured = get_settings().database_mysql_url
        if configured is None:
            raise ValueError("Vocabulary requires an explicitly configured MySQL DB.")
        url = make_url(configured.get_secret_value())
    engine = create_engine(url, hide_parameters=True)
    try:
        with engine.begin() as connection:
            metadata.create_all(connection, checkfirst=True)
    finally:
        engine.dispose()
    print("Vocabulary tables installed: " + ", ".join(sorted(metadata.tables)))


if __name__ == "__main__":
    main()
