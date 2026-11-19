"""Additive MySQL word states and retry/import receipts for the authored slice."""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
    UnicodeText,
)

metadata = MetaData()
word_states = Table(
    "engmate_vocabulary_word_states",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("TopicId", String(64), primary_key=True),
    Column("WordId", String(80), primary_key=True),
    Column("Remembered", Boolean, nullable=False),
    Column("Version", Integer, nullable=False),
    Column("UpdatedAt", DateTime, nullable=False),
)
requests = Table(
    "engmate_vocabulary_requests",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("RequestId", String(36), primary_key=True),
    Column("Kind", String(24), nullable=False),
    Column("PayloadHash", String(64), nullable=False),
    Column("ResultJson", UnicodeText, nullable=False),
)
