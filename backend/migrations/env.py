"""Alembic's entry point. The backend runs it itself, on the connection that
db.run_migrations() opens, so there is no alembic.ini and no URL here (ARC-03)."""

from alembic import context

from backend.db import metadata

connection = context.config.attributes["connection"]
context.configure(connection=connection, target_metadata=metadata, render_as_batch=True)
with context.begin_transaction():
    context.run_migrations()
