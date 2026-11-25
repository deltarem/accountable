"""npm run seed on Supabase needs --yes, and seeding keeps `users` (RUN-03, SEED-07)."""

import pytest
from sqlalchemy import select

from backend import db, seed
from backend.db import organizations, users

SUPABASE_DB = "postgresql://postgres.abc:s3cret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"


@pytest.fixture
def on_postgres(monkeypatch):
    """DATABASE_URL points at Postgres. Nothing may connect to it: counting is faked,
    and seeding would fail the test through the socket block in conftest.py."""
    monkeypatch.setenv("DATABASE_URL", SUPABASE_DB)
    monkeypatch.setattr(seed, "count_records", lambda: 123)
    resets = []
    monkeypatch.setattr(seed, "seed_database", lambda empty=False: resets.append(empty))
    return resets


def test_postgres_without_yes_stops(on_postgres, capsys):
    assert seed.main([]) == 1
    assert on_postgres == []
    err = capsys.readouterr().err
    assert "Postgres database postgres on aws-0-eu-west-1.pooler.supabase.com" in err
    assert "123 records" in err
    assert "npm run seed -- --yes" in err
    assert "s3cret" not in err


def test_postgres_with_yes_goes_ahead(on_postgres, capsys):
    assert seed.main(["--yes"]) == 0
    assert on_postgres == [False]
    assert "s3cret" not in capsys.readouterr().out


def test_sqlite_needs_no_yes(fresh_db, capsys):
    assert seed.main([]) == 0
    assert "reset to the sample data" in capsys.readouterr().out
    with db.reading() as conn:
        assert len(conn.execute(select(organizations)).all()) == 10


def test_seeding_keeps_users(client):
    client.get("/api/me")
    seed.seed_database()
    seed.seed_database(empty=True)
    with db.reading() as conn:
        assert [r.id for r in conn.execute(select(users.c.id))] == ["user-priya"]
