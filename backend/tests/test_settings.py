"""The settings come from the environment only, and local mode never reaches Postgres
(ARC-17, DEC-19, ARC-14)."""

import pytest

from backend import db, settings
from backend.settings import SettingsError

SUPABASE_DB = "postgresql://postgres.abc:secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"


def test_without_database_url_it_is_sqlite(fresh_db):
    config = settings.load()
    assert config.database_url == f"sqlite:///{(fresh_db / 'test.db').as_posix()}"
    assert not config.is_postgres


@pytest.mark.parametrize("scheme", ["postgres://", "postgresql://"])
def test_database_url_uses_psycopg(monkeypatch, scheme):
    monkeypatch.setenv("DATABASE_URL", SUPABASE_DB.replace("postgresql://", scheme))
    config = settings.load()
    assert config.database_url.startswith("postgresql+psycopg://postgres.abc:")
    assert config.is_postgres


def test_database_url_must_be_postgres(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "mysql://somewhere/db")
    with pytest.raises(SettingsError, match="must be a Postgres"):
        settings.load()


def test_local_mode_refuses_postgres(monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_LOCAL", "1")
    monkeypatch.setenv("DATABASE_URL", SUPABASE_DB)
    with pytest.raises(SettingsError, match="Local mode only runs on SQLite"):
        settings.load()


def test_local_mode_refuses_to_start_on_postgres(monkeypatch, client):
    monkeypatch.setenv("ACCOUNTABLE_LOCAL", "1")
    monkeypatch.setenv("DATABASE_URL", SUPABASE_DB)
    db.dispose_engines()
    with pytest.raises(SettingsError), client:
        pass


def test_local_mode_ignores_the_supabase_settings(monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_LOCAL", "1")
    monkeypatch.setenv("SUPABASE_URL", "https://real-project.supabase.co")
    config = settings.load()
    assert config.local
    assert config.supabase_url is None


def test_local_mode_is_off_unless_asked_for(monkeypatch):
    for value in ("", "0", "true", "yes"):
        monkeypatch.setenv("ACCOUNTABLE_LOCAL", value)
        assert not settings.load().local


def test_checking_tokens_needs_supabase_url(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL")
    with pytest.raises(SettingsError, match="SUPABASE_URL is not set"):
        settings.load().require_supabase_url()


def test_the_supabase_url_loses_a_trailing_slash(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://abc.supabase.co/")
    assert settings.load().require_supabase_url() == "https://abc.supabase.co"


def test_the_backend_never_reads_a_dotenv_file(tmp_path, monkeypatch):
    """Only the Node scripts load .env, so a test run never sees the team's settings."""
    (tmp_path / ".env").write_text(f"DATABASE_URL={SUPABASE_DB}\nACCOUNTABLE_LOCAL=1\n")
    monkeypatch.chdir(tmp_path)
    config = settings.load()
    assert not config.is_postgres
    assert not config.local
