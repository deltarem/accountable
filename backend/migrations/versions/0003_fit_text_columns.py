"""Columns wide enough for what the forms accept (DM-01, DM-02).

SQLite never enforced these lengths, so the mismatch went unseen until Postgres:
- a phone number may be 200 characters, but the column held 100
- a website may be 500 characters as typed, and https:// (8) is added to it.

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("contacts") as batch:
        batch.alter_column("phone", type_=sa.String(200), existing_type=sa.String(100))
    with op.batch_alter_table("organizations") as batch:
        batch.alter_column("website", type_=sa.String(508), existing_type=sa.String(500))


def downgrade() -> None:
    with op.batch_alter_table("organizations") as batch:
        batch.alter_column("website", type_=sa.String(500), existing_type=sa.String(508))
    with op.batch_alter_table("contacts") as batch:
        batch.alter_column("phone", type_=sa.String(100), existing_type=sa.String(200))
