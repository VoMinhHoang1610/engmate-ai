"""Parameterized Core queries and optimistic updates over reflected tables."""

from typing import Any

from fastapi import HTTPException
from sqlalchemy import Connection, select

from app.db.database import Database, Record


class Repository:
    """Keep SQL execution separate from business rules and HTTP routes."""

    def __init__(self, database: Database, connection: Connection) -> None:
        """Bind this repository to its service transaction."""
        self.database = database
        self.connection = connection

    def rows(self, name: str, **filters: Any) -> list[Record]:
        """Select equality-filtered rows from a server-controlled table."""
        table = self.database.models.table(name, self.connection)
        query = select(table)
        for key, value in filters.items():
            query = query.where(table.c[key] == value)
        return [dict(row) for row in self.connection.execute(query).mappings()]

    def page(
        self, name: str, order: str, offset: int, limit: int, **filters: Any
    ) -> list[Record]:
        """Bound list reads and use a deterministic SQL Server ordering."""
        table = self.database.models.table(name, self.connection)
        query = select(table)
        for key, value in filters.items():
            query = query.where(table.c[key] == value)
        query = query.order_by(table.c[order]).offset(offset).limit(limit)
        return [dict(row) for row in self.connection.execute(query).mappings()]

    def one(self, name: str, **filters: Any) -> Record:
        """Return a matching resource or a non-disclosing 404."""
        rows = self.rows(name, **filters)
        if not rows:
            raise HTTPException(404, "Resource not found.")
        return rows[0]

    def insert(self, name: str, **values: Any) -> Record:
        """Insert and return server-generated identities/defaults/rowversion."""
        table = self.database.models.table(name, self.connection)
        statement = table.insert().values(**values).returning(table)
        return dict(self.connection.execute(statement).mappings().one())

    def update(self, name: str, filters: Record, values: Record) -> Record:
        """Update exactly one row, respecting an optional expected Version."""
        table = self.database.models.table(name, self.connection)
        statement = table.update().values(**values)
        for key, value in filters.items():
            statement = statement.where(table.c[key] == value)
        row = self.connection.execute(statement.returning(table)).mappings().first()
        if row is None:
            raise HTTPException(409, "Resource changed; reload before saving.")
        return dict(row)
