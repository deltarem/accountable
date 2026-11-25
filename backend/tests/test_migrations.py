"""Migrations: a new database, a file from before them, and agreement with db.py's
tables (ARC-03, RUN-05, DM-06, DM-07)."""

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import MetaData, String, insert, select
from sqlalchemy.exc import IntegrityError

from backend import clock, db


@pytest.fixture
def blank(fresh_db, monkeypatch):
    """A database file with no tables at all."""
    monkeypatch.setenv("ACCOUNTABLE_DB", str(fresh_db / "blank.db"))
    db.dispose_engines()
    return fresh_db / "blank.db"


def test_a_new_database_migrates_to_exactly_the_tables_in_db_py(blank):
    assert db.run_migrations() is True
    with db.get_engine().connect() as conn:
        assert compare_metadata(MigrationContext.configure(conn), db.metadata) == []
    assert db.run_migrations() is False


def test_the_check_on_activities_survives_the_rebuild(blank):
    db.run_migrations()
    with pytest.raises(IntegrityError), db.transaction() as conn:
        conn.execute(
            insert(db.activities).values(
                type="note",
                description="Belongs to nothing",
                occurred_at=clock.now(),
                follow_up_done=False,
                created_at=clock.now(),
                updated_at=clock.now(),
            )
        )


def test_a_file_from_before_migrations_keeps_its_data(blank):
    # Make the file the way the app did before migrations: the baseline tables and
    # some records, with no alembic_version table.
    with db.get_engine().begin() as conn:
        command.upgrade(db._alembic_config(conn), db.BASELINE)
    old = MetaData()
    with db.get_engine().begin() as conn:
        old.reflect(conn)
        at = clock.now()
        org_id = conn.execute(
            insert(old.tables["organizations"])
            .values(name="Kept Ltd", created_at=at, updated_at=at)
            .returning(old.tables["organizations"].c.id)
        ).scalar_one()
        conn.execute(
            insert(old.tables["contacts"]).values(
                name="Kept Person",
                organization_id=org_id,
                status="lead",
                created_at=at,
                updated_at=at,
            )
        )
        old.tables["alembic_version"].drop(conn)

    assert db.run_migrations() is False
    with db.reading() as conn:
        org = conn.execute(select(db.organizations)).mappings().one()
        contact = conn.execute(select(db.contacts)).mappings().one()
        assert conn.execute(select(db.users)).all() == []
    assert (org["name"], org["created_by"], org["updated_by"]) == ("Kept Ltd", None, None)
    assert (contact["name"], contact["organization_id"]) == ("Kept Person", org_id)


def test_startup_seeds_only_a_new_database(blank, client):
    with client:
        assert len(client.get("/api/organizations").json()) == 10
        client.post("/api/organizations", json={"name": "Made after the first start"})
    db.dispose_engines()
    with client:
        names = [o["name"] for o in client.get("/api/organizations").json()]
    assert len(names) == 11


def fits(table, record):
    """The string columns whose stored value is longer than the column allows. SQLite
    doesn't enforce lengths; Postgres refuses the save."""
    return {
        c.name: len(record[c.name])
        for c in table.columns
        if isinstance(c.type, String)
        and c.type.length
        and isinstance(record.get(c.name), str)
        and len(record[c.name]) > c.type.length
    }


def test_the_longest_values_the_forms_allow_fit_their_columns(api):
    org = api.org(name="n" * 200, website="w" * 500, industry="i" * 200, notes="x" * 5000)
    contact = api.contact(
        name="n" * 200,
        email="e" * (320 - len("@b.co")) + "@b.co",
        phone="1" * 200,
        job_title="j" * 200,
    )
    deal = api.deal(name="d" * 200, organization_id=org["id"])
    assert fits(db.organizations, org) == {}
    assert fits(db.contacts, contact) == {}
    assert fits(db.deals, deal) == {}
