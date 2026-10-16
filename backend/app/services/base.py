"""Shared transaction boundary for account-owned conversation data."""

from collections.abc import Iterator
from contextlib import contextmanager

from app.db.database import Database
from app.db.repository import Repository


class PersistenceService:
    """Share short transactions and per-user mutation locks."""

    def __init__(self, database: Database) -> None:
        """Use a shared database without an eager connection."""
        self.db = database

    @contextmanager
    def transaction(self, user_id: int | None = None) -> Iterator[Repository]:
        """Serialize mutations for one learner to prevent double credits."""
        with self.db.transaction() as connection:
            if user_id is not None:
                self.db.lock_user(connection, user_id)
            yield Repository(self.db, connection)
