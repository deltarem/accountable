"""The settings, read from the environment only (ARC-17).

The backend never reads `.env` itself: the Node scripts (`npm run dev`, `npm start`,
`npm run seed`) load it and pass it on. So the test runners, which don't go through
those scripts, never see the team's settings (ARC-14).

- DATABASE_URL: Postgres on Supabase. Without it, the database is a SQLite file,
  ACCOUNTABLE_DB or data/accountable.db.
- SUPABASE_URL: the project's address, used to check sign-in tokens (AUTH-02).
- SUPABASE_PUBLISHABLE_KEY: only the browser needs it; the build reads it.
- ACCOUNTABLE_LOCAL=1: local mode, with the built-in test user (DEC-19). The
  Supabase settings are ignored, and a Postgres DATABASE_URL is refused.
"""

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_DB = "data/accountable.db"


class SettingsError(Exception):
    """A setting is missing or not allowed. The message says what to do."""


@dataclass(frozen=True)
class Settings:
    local: bool
    database_url: str
    supabase_url: str | None

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")

    def require_supabase_url(self) -> str:
        if not self.supabase_url:
            raise SettingsError(
                "SUPABASE_URL is not set, so sign-in tokens can't be checked. "
                "Add it to .env (see .env.example), or use npm run dev:local to work offline."
            )
        return self.supabase_url


def _env(name: str) -> str | None:
    value = os.environ.get(name, "").strip()
    return value or None


def sqlite_path() -> Path:
    return Path(_env("ACCOUNTABLE_DB") or DEFAULT_DB)


def postgres_url(url: str) -> str:
    """Supabase gives postgres:// or postgresql://; SQLAlchemy needs the psycopg 3 driver named."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def load() -> Settings:
    """Read the settings now. Cheap, so it's read on each use and tests can change them."""
    local = _env("ACCOUNTABLE_LOCAL") == "1"
    database_url = _env("DATABASE_URL")
    if database_url and not database_url.startswith(("postgres://", "postgresql")):
        raise SettingsError("DATABASE_URL must be a Postgres connection string from Supabase.")
    if local and database_url:
        # DEC-19: the public test user must never reach the team's data.
        raise SettingsError(
            "Local mode only runs on SQLite, but DATABASE_URL points to Postgres. "
            "Remove DATABASE_URL from the environment, or run npm run dev without local mode."
        )
    sqlite_url = f"sqlite:///{sqlite_path().as_posix()}"
    return Settings(
        local=local,
        database_url=postgres_url(database_url) if database_url else sqlite_url,
        supabase_url=None if local else (_env("SUPABASE_URL") or "").rstrip("/") or None,
    )
