"""Short SQL Server transactions with per-user serialization for mutations."""

from collections.abc import Iterator
from contextlib import contextmanager
from threading import Lock
from typing import Any

from fastapi import HTTPException
from sqlalchemy import Connection, Engine, create_engine, text
from sqlalchemy.engine import URL

from app.core.config import Settings
from app.models.catalog import ModelCatalog


class Database:
    """Lazily connect so the scaffold health/mock endpoints still work without DB."""

    def __init__(
        self, settings: Settings, connection: Connection | None = None
    ) -> None:
        """Allow rollback-only integration tests to inject their connection."""
        self.settings = settings
        self.external_connection = connection
        self.engine: Engine | None = None
        self.models = ModelCatalog()
        self.engine_lock = Lock()

    def get_engine(self) -> Engine:
        """Create a private engine without logging the connection string."""
        with self.engine_lock:
            return self.create_engine_once()

    def create_engine_once(self) -> Engine:
        """Initialize one pool while holding the creation lock."""
        if self.engine is None:
            secret = self.settings.database_odbc_connection
            if secret is None:
                raise HTTPException(503, "SQL Server is not configured.")
            self.engine = create_engine(
                URL.create(
                    "mssql+pyodbc", query={"odbc_connect": secret.get_secret_value()}
                ),
                pool_pre_ping=True,
                connect_args={"timeout": 10},
                hide_parameters=True,
            )
        return self.engine

    @contextmanager
    def transaction(self) -> Iterator[Connection]:
        """Commit one business operation or roll it back as a unit."""
        if self.external_connection is not None:
            with self.external_connection.begin_nested():
                yield self.external_connection
        else:
            with self.get_engine().begin() as connection:
                connection.exec_driver_sql("SET ARITHABORT ON; SET XACT_ABORT OFF;")
                yield connection

    def lock_user(self, connection: Connection, user_id: int) -> None:
        """Serialize retries, refresh rotation and sequenced writes for one owner."""
        connection.execute(
            text(
                "SELECT UserId FROM em.Users WITH (UPDLOCK, HOLDLOCK) WHERE UserId=:id"
            ),
            {"id": user_id},
        ).first()

    def close(self) -> None:
        """Release the pool on ASGI shutdown."""
        if self.engine is not None:
            self.engine.dispose()


Record = dict[str, Any]
