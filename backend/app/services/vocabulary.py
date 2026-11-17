"""Owner-scoped self-assessment with explicit installation fallback and replay."""

import hashlib
import json
import re
from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import HTTPException
from sqlalchemy import Connection, and_, select
from sqlalchemy.exc import DBAPIError

from app.db.database import Database, Record
from app.db.vocabulary import metadata, requests, word_states
from app.schemas.vocabulary import LegacyImport, WordStateUpdate
from app.services.common import now
from app.services.vocabulary_catalog import LEGACY_KEYS, require_word

IMPORT_MARKER = "legacy-import-v1"


class VocabularyService:
    """Never create tables on application startup or hide unrelated DB errors."""

    def __init__(self, database: Database) -> None:
        """Use the existing account database without installing any tables."""
        self.db = database

    @contextmanager
    def transaction(self, user_id: int | None = None) -> Iterator[Connection]:
        """Translate only missing vocabulary tables; serialize writes by owner."""
        if not self.db.mysql:
            raise HTTPException(503, {"code": "vocabulary_mysql_required"})
        try:
            with self.db.transaction() as connection:
                if user_id is not None:
                    self.db.lock_user(connection, user_id)
                yield connection
        except DBAPIError as exc:
            missing = getattr(exc.orig, "args", (None,))[0] == 1146
            if missing and any(
                re.search(r"\." + re.escape(name) + r"['`]", str(exc.orig))
                for name in metadata.tables
            ):
                raise HTTPException(503, {"code": "vocabulary_not_installed"}) from None
            raise

    @staticmethod
    def receipt(connection: Connection, user_id: int, request_id: str) -> Record | None:
        """Find receipts only within the authenticated account."""
        row = (
            connection.execute(
                select(requests).where(
                    requests.c.UserId == user_id, requests.c.RequestId == request_id
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    @staticmethod
    def remember_receipt(
        connection: Connection,
        user_id: int,
        request_id: str,
        kind: str,
        payload_hash: str,
        result: Record,
    ) -> None:
        """Persist the exact acknowledgement in the same transaction as state."""
        connection.execute(
            requests.insert().values(
                UserId=user_id,
                RequestId=request_id,
                Kind=kind,
                PayloadHash=payload_hash,
                ResultJson=json.dumps(result, ensure_ascii=False),
            )
        )

    def states(self, user_id: int) -> Record:
        """Return sparse states; an unavailable store is never an empty success."""
        with self.transaction() as connection:
            rows = (
                connection.execute(
                    select(word_states).where(word_states.c.UserId == user_id)
                )
                .mappings()
                .all()
            )
            imported = self.receipt(connection, user_id, IMPORT_MARKER) is not None
            return {
                "states": [
                    {
                        "topic_id": row["TopicId"],
                        "word_id": row["WordId"],
                        "remembered": bool(row["Remembered"]),
                        "version": row["Version"],
                    }
                    for row in rows
                ],
                "legacy_imported": imported,
            }

    def save(
        self, user_id: int, topic_id: str, word_id: str, data: WordStateUpdate
    ) -> Record:
        """Replay before version checks; a new UUID cannot overwrite stale state."""
        require_word(topic_id, word_id)
        payload = ["state", topic_id, word_id, data.remembered, data.version]
        digest = hashlib.sha256(json.dumps(payload).encode()).hexdigest()
        request_id = str(data.client_request_id)
        with self.transaction(user_id) as connection:
            receipt = self.receipt(connection, user_id, request_id)
            if receipt:
                if receipt["PayloadHash"] != digest:
                    raise HTTPException(409, "Request identity already used.")
                result: Record = json.loads(receipt["ResultJson"])
                return result
            condition = and_(
                word_states.c.UserId == user_id,
                word_states.c.TopicId == topic_id,
                word_states.c.WordId == word_id,
            )
            row = (
                connection.execute(select(word_states).where(condition))
                .mappings()
                .first()
            )
            version = row["Version"] if row else 0
            if data.version != version:
                raise HTTPException(409, "Word state has changed.")
            values = {
                "Remembered": data.remembered,
                "Version": version + 1,
                "UpdatedAt": now(),
            }
            if row:
                connection.execute(
                    word_states.update().where(condition).values(**values)
                )
            else:
                connection.execute(
                    word_states.insert().values(
                        UserId=user_id, TopicId=topic_id, WordId=word_id, **values
                    )
                )
            result = {
                "topic_id": topic_id,
                "word_id": word_id,
                "remembered": data.remembered,
                "version": version + 1,
            }
            self.remember_receipt(
                connection, user_id, request_id, "state", digest, result
            )
            return result

    def import_legacy(self, user_id: int, data: LegacyImport) -> Record:
        """Import once, preserving existing false states and all local data."""
        keys = sorted(set(data.remembered_keys))
        if any(key not in LEGACY_KEYS for key in keys):
            raise HTTPException(422, "Unknown legacy vocabulary key.")
        digest = hashlib.sha256(json.dumps(["import", keys]).encode()).hexdigest()
        request_id = str(data.client_request_id)
        with self.transaction(user_id) as connection:
            receipt = self.receipt(connection, user_id, request_id)
            if receipt:
                if receipt["PayloadHash"] != digest:
                    raise HTTPException(409, "Request identity already used.")
                replay: Record = json.loads(receipt["ResultJson"])
                return replay
            marker = self.receipt(connection, user_id, IMPORT_MARKER)
            imported = 0
            if marker is None:
                for key in keys:
                    topic_id, word_id = LEGACY_KEYS[key]
                    exists = connection.execute(
                        select(word_states.c.Version).where(
                            word_states.c.UserId == user_id,
                            word_states.c.TopicId == topic_id,
                            word_states.c.WordId == word_id,
                        )
                    ).first()
                    if exists is None:
                        connection.execute(
                            word_states.insert().values(
                                UserId=user_id,
                                TopicId=topic_id,
                                WordId=word_id,
                                Remembered=True,
                                Version=1,
                                UpdatedAt=now(),
                            )
                        )
                        imported += 1
            result = {"imported": imported, "skipped": len(keys) - imported}
            if marker is None:
                self.remember_receipt(
                    connection, user_id, IMPORT_MARKER, "import_marker", digest, result
                )
            self.remember_receipt(
                connection, user_id, request_id, "import", digest, result
            )
            return result
