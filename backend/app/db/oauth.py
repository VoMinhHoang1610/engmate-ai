"""Additive social identity bindings; installed explicitly, never on app startup."""

from sqlalchemy import BigInteger, Column, MetaData, String, Table, UniqueConstraint

metadata = MetaData()
identities = Table(
    "engmate_oauth_identities",
    metadata,
    Column("Provider", String(16), primary_key=True),
    Column("SubjectHash", String(64), primary_key=True),
    Column("UserId", BigInteger, nullable=False),
    UniqueConstraint("UserId", "Provider", name="uq_engmate_oauth_user_provider"),
)
