"""Engine, table definitions and the transaction helper (DM-01 to DM-06).

SQLAlchemy Core with generic types only, so the same tables can move to
Postgres later. Foreign keys are declared, but the delete rules live in the
services (ARC-04).
"""

import os
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    and_,
    create_engine,
    or_,
)
from sqlalchemy.engine import Connection, Engine

DEFAULT_DB = "data/accountable.db"

metadata = MetaData()


def _stamps():
    return [
        Column("created_at", DateTime, nullable=False),
        Column("updated_at", DateTime, nullable=False),
    ]


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("website", String(500)),
    Column("industry", String(200)),
    Column("notes", Text),
    *_stamps(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("email", String(320)),
    Column("phone", String(100)),
    Column("job_title", String(200)),
    Column("organization_id", Integer, ForeignKey("organizations.id")),
    Column("status", String(20), nullable=False, default="lead"),
    *_stamps(),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id")),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
    Column("stage", String(20), nullable=False),
    Column("value_cents", Integer, nullable=False, default=0),
    Column("probability", Integer, nullable=False),
    Column("close_date", Date),
    Column("position", Integer, nullable=False, default=0),
    *_stamps(),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String(10), nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
    Column("deal_id", Integer, ForeignKey("deals.id")),
    Column("description", Text, nullable=False),
    Column("occurred_at", DateTime, nullable=False),
    Column("follow_up_date", Date),
    Column("follow_up_done", Boolean, nullable=False, default=False),
    *_stamps(),
)

# An activity belongs to exactly one record: a contact or a deal.
activities.append_constraint(
    CheckConstraint(
        or_(
            and_(activities.c.contact_id.is_not(None), activities.c.deal_id.is_(None)),
            and_(activities.c.contact_id.is_(None), activities.c.deal_id.is_not(None)),
        ),
        name="activity_has_one_record",
    )
)

events = Table(
    "events",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("kind", String(20), nullable=False),
    Column("deal_id", Integer, ForeignKey("deals.id")),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
    Column("from_value", String(20)),
    Column("to_value", String(20)),
    Column("occurred_at", DateTime, nullable=False),
    *_stamps(),
)

ALL_TABLES = [events, activities, deals, contacts, organizations]


def db_path() -> Path:
    return Path(os.environ.get("ACCOUNTABLE_DB") or DEFAULT_DB)


_engines: dict[str, Engine] = {}


def get_engine() -> Engine:
    """One engine per database file, with a 10-second busy timeout."""
    path = db_path()
    key = str(path.resolve())
    if key not in _engines:
        path.parent.mkdir(parents=True, exist_ok=True)
        _engines[key] = create_engine(
            f"sqlite:///{path.as_posix()}",
            connect_args={"timeout": 10, "check_same_thread": False},
        )
    return _engines[key]


def dispose_engines() -> None:
    for engine in _engines.values():
        engine.dispose()
    _engines.clear()


def create_tables() -> None:
    metadata.create_all(get_engine())


@contextmanager
def transaction():
    """Every service write goes through here: one transaction per user action (DM-06)."""
    with get_engine().begin() as conn:
        yield conn


@contextmanager
def reading():
    with get_engine().connect() as conn:
        yield conn


__all__ = [
    "ALL_TABLES",
    "Connection",
    "activities",
    "contacts",
    "create_tables",
    "db_path",
    "deals",
    "dispose_engines",
    "events",
    "get_engine",
    "metadata",
    "organizations",
    "reading",
    "transaction",
]
