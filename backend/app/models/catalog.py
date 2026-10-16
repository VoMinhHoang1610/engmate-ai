"""Reflect only the legacy tables needed by account and conversation workflows."""

from threading import Lock

from sqlalchemy import Connection, MetaData, Table

MYSQL_TABLES = dict(
    zip(
        (
            "SchemaVersions Users LearnerProfiles AuthSessions StudySessions "
            "Conversations Messages AIEvaluations"
        ).split(),
        (
            "PhienBanCauTruc NguoiDung HoSoNguoiHoc PhienDangNhap "
            "PhienHoc HoiThoai TinNhan DanhGiaAI"
        ).split(),
        strict=True,
    )
)
TABLE_NAMES = frozenset(MYSQL_TABLES)


class ModelCatalog:
    """Reuse existing data without creating or dropping application tables."""

    def __init__(self, mysql: bool = False) -> None:
        """Scope reflected metadata and its lock to one database instance."""
        self.mysql = mysql
        self.table_names = TABLE_NAMES
        self.metadata = MetaData(schema=None if mysql else "em")
        self.lock = Lock()

    def table(self, name: str, connection: Connection) -> Table:
        """Resolve server-owned identifiers; clients cannot select SQL names."""
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
