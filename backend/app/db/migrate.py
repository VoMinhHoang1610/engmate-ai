"""Explicit, version-aware deployment of the existing SQL Server scripts."""

import re
from pathlib import Path

from sqlalchemy import Connection, text

from app.core.config import get_settings
from app.db.database import Database

SQL_ROOT = Path(__file__).resolve().parents[3] / "database" / "sqlserver"


def apply_scripts(connection: Connection, root: Path = SQL_ROOT) -> None:
    """Apply schema, idempotent seed and views atomically to the selected database."""
    version = connection.execute(
        text(
            "IF OBJECT_ID(N'em.SchemaVersions', N'U') IS NULL SELECT 0 "
            "ELSE SELECT MAX(Version) FROM em.SchemaVersions;"
        )
    ).scalar_one()
    if version not in (0, 1):
        raise ValueError(
            "Unsupported schema version; apply a reviewed migration first."
        )
    for filename in ("001_schema.sql", "002_seed_catalog.sql", "003_views.sql"):
        if filename == "001_schema.sql" and version == 1:
            continue
        script = (root / filename).read_text(encoding="utf-8-sig")
        for batch in re.split(r"(?im)^\s*GO\s*(?:--[^\n]*)?$", script):
            if batch.strip():
                connection.exec_driver_sql(batch)


def main() -> None:
    """Deploy to an already-created database; never silently create a database."""
    database = Database(get_settings())
    try:
        with database.transaction() as connection:
            apply_scripts(connection)
        print("SQL Server schema v1, catalogue and views applied successfully.")
    finally:
        database.close()


if __name__ == "__main__":
    main()
