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

MYSQL_TABLES = dict(
    zip(
        "SchemaVersions Users LearnerProfiles UserSettings MediaAssets OAuthIdentities "
        "AuthSessions AccountTokens Topics Lessons LessonQuestions QuestionOptions "
        "StudySessions Conversations Messages PracticeAttempts AttemptAnswers "
        "AIEvaluations ErrorRecords UserVocabulary FlashcardSessions FlashcardReviews "
        "vUserLearningStats vDailyLearningStats CefrLevels LessonVocabulary".split(),
        "PhienBanCauTruc NguoiDung HoSoNguoiHoc CaiDatNguoiDung "
        "TaiNguyenMedia DanhTinhOAuth "
        "PhienDangNhap TokenTaiKhoan ChuDe BaiHoc CauHoiBaiHoc LuaChonCauHoi "
        "PhienHoc HoiThoai TinNhan LuotThucHanh CauTraLoiThucHanh "
        "DanhGiaAI BanGhiLoi TuVungNguoiDung PhienFlashcard OnTapFlashcard "
        "vThongKeHocTapNguoiDung vThongKeHocTapHangNgay "
        "TrinhDoCEFR TuVungBaiHoc".split(),
        strict=True,
    )
)


class ModelCatalog:
    """Reuse reflected columns and SQL types without generating replacement DDL."""

    table_names = TABLE_NAMES

    def __init__(self, mysql: bool = False) -> None:
        """Create a catalog scoped to one database instance."""
        self.mysql = mysql
        self.table_names = frozenset(MYSQL_TABLES) if mysql else TABLE_NAMES
        self.metadata = MetaData(schema=None if mysql else "em")
        self.lock = Lock()

    def table(self, name: str, connection: Connection) -> Table:
        """Resolve only known tables/views; clients never choose SQL identifiers."""
        if name not in self.table_names:
            raise ValueError("Unknown application table")
        physical = MYSQL_TABLES[name] if self.mysql else name
        key = physical if self.mysql else "em." + name
        with self.lock:
            if key not in self.metadata.tables:
                Table(
                    physical, self.metadata, autoload_with=connection, resolve_fks=False
                )
        return self.metadata.tables[key]
