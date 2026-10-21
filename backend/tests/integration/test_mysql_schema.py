"""Check installed MySQL DDL against the tables consumed by learning services."""

from sqlalchemy import Boolean, String, inspect, select, text

from app.db.database import Database
from app.db.learning import metadata
from app.services.curriculum import course
from tests.integration.test_chat_database import database

__all__ = ["database"]


def test_learning_tables_match_runtime_metadata(database: Database) -> None:
    """Catch missing tables, wrong nullability/types/keys and identity drift."""
    with database.transaction() as connection:
        schema = inspect(connection)
        for table in metadata.sorted_tables:
            columns = {item["name"]: item for item in schema.get_columns(table.name)}
            assert set(columns) == set(table.columns.keys()), table.name
            primary_key = schema.get_pk_constraint(table.name)["constrained_columns"]
            assert primary_key == [column.name for column in table.primary_key]
            for expected in table.columns:
                actual = columns[expected.name]
                assert actual["nullable"] == expected.nullable
                reflected_type = actual["type"].copy()
                if (
                    isinstance(reflected_type, String)
                    and isinstance(expected.type, String)
                    and expected.type.collation is None
                ):
                    # MySQL reflection includes inherited collation; metadata
                    # delegates it to the database rather than declaring one.
                    reflected_type.collation = None
                actual_type = str(reflected_type.compile(dialect=connection.dialect))
                expected_type = str(expected.type.compile(dialect=connection.dialect))
                if isinstance(expected.type, Boolean):
                    assert actual_type == "TINYINT(1)"
                else:
                    assert actual_type == expected_type, (table.name, expected.name)
                assert actual.get("default") is None
                assert actual.get("autoincrement") is not True
            assert schema.get_foreign_keys(table.name) == []
        triggers = connection.execute(
            text(
                "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS "
                "WHERE TRIGGER_SCHEMA = DATABASE() "
                "AND EVENT_OBJECT_TABLE LIKE 'engmate_learning_%'"
            )
        ).all()
        assert triggers == [], "Learning plan versions are updated by the service."


def test_base_schema_accepts_course_levels(database: Database) -> None:
    """Keep course level references and readiness compatible with fresh bootstrap."""
    with database.transaction() as connection:
        versions = database.models.table("SchemaVersions", connection)
        assert connection.execute(select(versions.c.Version)).scalars().all() == [1]
        available = set(
            connection.execute(text("SELECT Code FROM TrinhDoCEFR")).scalars()
        )
        assert {stage.level for stage in course().stages} <= available
