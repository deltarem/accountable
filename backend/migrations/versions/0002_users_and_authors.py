"""The users table, and who added and last changed each record (DM-07, DM-08).

Existing records get no author, so they read "Sample data" (SEED-07).

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

RECORDS = ("organizations", "contacts", "deals", "activities")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    # Batch mode, because SQLite can only add a foreign key by rebuilding the table.
    for table in RECORDS:
        with op.batch_alter_table(table) as batch:
            for column in ("created_by", "updated_by"):
                batch.add_column(sa.Column(column, sa.String(64)))
                batch.create_foreign_key(f"fk_{table}_{column}", "users", [column], ["id"])
    with op.batch_alter_table("events") as batch:
        batch.add_column(sa.Column("created_by", sa.String(64)))
        batch.create_foreign_key("fk_events_created_by", "users", ["created_by"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("events") as batch:
        batch.drop_constraint("fk_events_created_by", type_="foreignkey")
        batch.drop_column("created_by")
    for table in RECORDS:
        with op.batch_alter_table(table) as batch:
            for column in ("created_by", "updated_by"):
                batch.drop_constraint(f"fk_{table}_{column}", type_="foreignkey")
                batch.drop_column(column)
    op.drop_table("users")
