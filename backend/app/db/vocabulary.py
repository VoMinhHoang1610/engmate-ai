"""Additive MySQL word states and retry/import receipts for the authored slice."""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Index,
    Integer,
    MetaData,
    SmallInteger,
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
custom_topics = Table(
    "engmate_vocabulary_custom_topics",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("TopicId", String(36), primary_key=True),
    Column("TitleVi", String(60), nullable=False),
    Column("TitleEn", String(60), nullable=False),
    Column("Description", String(240), nullable=False),
    Column("WordCount", SmallInteger, nullable=False),
    Column("ReviewStatus", String(32), nullable=False),
    Column("PromptVersion", String(16), nullable=False),
    Column("ContentHash", String(64), nullable=False),
    Column("CreatedAt", DateTime, nullable=False),
    Index("IX_VocabCustomTopics_OwnerCreated", "UserId", "CreatedAt"),
)
custom_words = Table(
    "engmate_vocabulary_custom_words",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("TopicId", String(36), primary_key=True),
    Column("WordId", String(80), primary_key=True),
    Column("Position", SmallInteger, nullable=False),
    Column("Term", String(80), nullable=False),
    Column("PartOfSpeech", String(16), nullable=False),
    Column("Ipa", String(120), nullable=False),
    Column("MeaningVi", String(180), nullable=False),
    Column("ExampleEn", String(220), nullable=False),
    Column("ExampleVi", String(260), nullable=False),
    Column("Cefr", String(2), nullable=False),
    Column("CreatedAt", DateTime, nullable=False),
    Index("UQ_VocabCustomWords_Position", "UserId", "TopicId", "Position", unique=True),
    Index("IX_VocabCustomWords_OwnerTopic", "UserId", "TopicId"),
)
generation_jobs = Table(
    "engmate_vocabulary_generation_jobs",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("RequestId", String(36), primary_key=True),
    Column("AuthSessionId", BigInteger, nullable=False),
    Column("Kind", String(24), nullable=False),
    Column("PayloadHash", String(64), nullable=False),
    Column("TargetCount", SmallInteger, nullable=False),
    Column("BatchSize", SmallInteger, nullable=False),
    Column("CefrLevel", String(8), nullable=False),
    Column("Status", String(16), nullable=False),
    Column("ValidatedCount", SmallInteger, nullable=False),
    Column("CallsReserved", SmallInteger, nullable=False),
    Column("CallsUsed", SmallInteger, nullable=False),
    Column("TopicId", String(36), nullable=True),
    Column("ErrorCode", String(40), nullable=True),
    Column("CreatedAt", DateTime, nullable=False),
    Column("UpdatedAt", DateTime, nullable=False),
    Column("ExpiresAt", DateTime, nullable=False),
    Column("FinishedAt", DateTime, nullable=True),
    Index("IX_VocabJobs_OwnerStatus", "UserId", "Status"),
    Index("IX_VocabJobs_StatusExpiry", "Status", "ExpiresAt"),
    Index("IX_VocabJobs_OwnerCreated", "UserId", "CreatedAt"),
)
usage = Table(
    "engmate_vocabulary_usage",
    metadata,
    Column("UserId", BigInteger, primary_key=True, autoincrement=False),
    Column("UsageDate", Date, primary_key=True),
    Column("JobsStarted", SmallInteger, nullable=False),
    Column("CallsReserved", SmallInteger, nullable=False),
    Column("CallsUsed", SmallInteger, nullable=False),
    Column("UpdatedAt", DateTime, nullable=False),
)

VOCABULARY_TABLE_NAMES = tuple(sorted(metadata.tables))
TERMINAL_JOB_STATUSES = ("completed", "failed", "cancelled", "deleted")
