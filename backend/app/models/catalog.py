"""SQLAlchemy Core mappings reflected from the authoritative SQL Server schema."""

from threading import Lock

from sqlalchemy import Connection, MetaData, Table

TABLE_NAMES = frozenset(
    "SchemaVersions Users LearnerProfiles UserSettings MediaAssets OAuthIdentities "
    "AuthSessions AccountTokens Topics Lessons LessonQuestions QuestionOptions "
    "StudySessions Conversations Messages PracticeAttempts AttemptAnswers "
    "AIEvaluations ErrorRecords UserVocabulary FlashcardSessions FlashcardReviews "
    "vUserLearningStats vDailyLearningStats".split()
)


class ModelCatalog:
    """Reuse reflected columns and SQL types without generating replacement DDL."""

    table_names = TABLE_NAMES

    def __init__(self) -> None:
        """Create a catalog scoped to one database instance."""
        self.metadata = MetaData(schema="em")
        self.lock = Lock()

    def table(self, name: str, connection: Connection) -> Table:
        """Resolve only known tables/views; clients never choose SQL identifiers."""
        if name not in TABLE_NAMES:
            raise ValueError("Unknown application table")
        key = "em." + name
        with self.lock:
            if key not in self.metadata.tables:
                Table(name, self.metadata, autoload_with=connection, resolve_fks=False)
        return self.metadata.tables[key]
