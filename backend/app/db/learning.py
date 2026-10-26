"""Additive course tables, installed explicitly without touching legacy tables."""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
    UnicodeText,
)

metadata = MetaData()
plans = Table(
    "engmate_learning_plans",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("Version", Integer, nullable=False),
    Column("GoalScore", Integer, nullable=False),
    Column("StartStage", String(64), nullable=False),
    Column("Minutes", Integer, nullable=False),
    Column("ExamDate", Date, nullable=True),
)
progress = Table(
    "engmate_learning_progress",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("LessonId", String(100), primary_key=True),
    Column("ConversationId", BigInteger, nullable=True),
    Column("Phase", Integer, nullable=False),
    Column("Completed", Boolean, nullable=False),
    Column("CheckCorrect", Integer, nullable=False),
    Column("CheckTotal", Integer, nullable=False),
    Column("ReviewDue", DateTime, nullable=True),
)
bindings = Table(
    "engmate_learning_bindings",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("ConversationId", BigInteger, primary_key=True, autoincrement=False),
    Column("LessonId", String(100), nullable=False),
)
receipts = Table(
    "engmate_learning_receipts",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("RequestId", String(36), primary_key=True),
    Column("Kind", String(16), nullable=False),
    Column("PayloadHash", String(64), nullable=False),
    Column("ResultJson", UnicodeText, nullable=False),
)
