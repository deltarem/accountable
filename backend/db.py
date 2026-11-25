"""Engine, table definitions, migrations and the transaction helper (DM-01 to DM-08).

SQLAlchemy Core with generic types only, so the same tables and queries run on
SQLite and on Postgres (DM-06). Foreign keys are declared, but the delete rules
live in the services (ARC-04). Every change to the tables is also an Alembic
migration in backend/migrations/ (ARC-03).
"""

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
    inspect,
    or_,
)
from sqlalchemy.engine import Connection, Engine

from backend import settings

metadata = MetaData()


def _stamps():
    return [
        Column("created_at", DateTime, nullable=False),
        Column("updated_at", DateTime, nullable=False),
    ]


def _authors():
    """Who added the record and who last changed it (DM-08). Empty for sample data."""
    return [
        Column("created_by", String(64), ForeignKey("users.id")),
        Column("updated_by", String(64), ForeignKey("users.id")),
    ]


# One row per person who has signed in, keyed by their Supabase user id (DM-07).
users = Table(
    "users",
    metadata,
    Column("id", String(64), primary_key=True),
    Column("email", String(320), nullable=False),
    Column("name", String(200), nullable=False),
    *_stamps(),
)


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    # 500 characters as typed, plus the https:// the server may add (UI-FORM-07).
    Column("website", String(508)),
    Column("industry", String(200)),
    Column("notes", Text),
    *_stamps(),
    *_authors(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("email", String(320)),
    Column("phone", String(200)),
    Column("job_title", String(200)),
    Column("organization_id", Integer, ForeignKey("organizations.id")),
    Column("status", String(20), nullable=False, default="lead"),
    *_stamps(),
    *_authors(),
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
    *_authors(),
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
    *_authors(),
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
    Column("created_by", String(64), ForeignKey("users.id")),
    *_stamps(),
)

# The tables a reset clears, children first. `users` is never cleared (SEED-07).
ALL_TABLES = [events, activities, deals, contacts, organizations]


def db_path() -> Path:
    """The SQLite file, when the database is SQLite."""
    return settings.sqlite_path()


_engines: dict[str, Engine] = {}


def get_engine() -> Engine:
    """One engine per database. SQLite gets a 10-second busy timeout; Postgres, through
    Supabase's session pooler, a small pool that checks connections before use."""
    url = settings.load().database_url
    if url not in _engines:
        if url.startswith("sqlite"):
            db_path().parent.mkdir(parents=True, exist_ok=True)
            _engines[url] = create_engine(
                url, connect_args={"timeout": 10, "check_same_thread": False}
            )
        else:
            _engines[url] = create_engine(url, pool_pre_ping=True, pool_size=3, max_overflow=2)
    return _engines[url]


def dispose_engines() -> None:
    for engine in _engines.values():
        engine.dispose()
    _engines.clear()


MIGRATIONS = Path(__file__).resolve().parent / "migrations"
BASELINE = "0001"


def _alembic_config(conn: Connection):
    from alembic.config import Config

    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS))
    config.attributes["connection"] = conn
    return config


def run_migrations() -> bool:
    """Bring the database up to date (ARC-03). Returns True when it had no tables yet.

    A SQLite file from before migrations has the tables but no alembic_version. It is
    stamped at the baseline first, which describes those tables, so it keeps its data.
    """
    from alembic import command

    with get_engine().begin() as conn:
        tables = set(inspect(conn).get_table_names())
        config = _alembic_config(conn)
        if "alembic_version" not in tables and "organizations" in tables:
            command.stamp(config, BASELINE)
        command.upgrade(config, "head")
    return "organizations" not in tables


def create_tables() -> None:
    """The tables straight from the definitions above, stamped as fully migrated.
    Quicker than running every migration, so the unit tests use it; the migrations
    are checked against these definitions in test_migrations.py."""
    from alembic import command

    with get_engine().begin() as conn:
        metadata.create_all(conn)
        command.stamp(_alembic_config(conn), "head")


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
    "run_migrations",
    "transaction",
    "users",
]
