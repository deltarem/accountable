"""The company settings, with their one row.

A database from before this keeps the team's work, so it gets placeholder settings
with nobody recorded, never the made-up company (B12). A new database gets these
too, and the sample data then writes the made-up company's over them (B11). The
values are written out here, so this never changes when company.py does.

Revision ID: 0004
Revises: 0003
"""

from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

STARTING_SETTINGS = {
    "id": 1,
    "company_name": "Your company",
    "address": None,
    "email": None,
    "phone": None,
    "tax_label": "Sales tax",
    "tax_rate": 0,
    "payment_terms_days": 30,
    "quote_prefix": "QT-",
    "invoice_prefix": "INV-",
    "updated_by": None,
}


def upgrade() -> None:
    settings = op.create_table(
        "company_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_name", sa.Text(), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("tax_label", sa.Text(), nullable=True),
        sa.Column("tax_rate", sa.Integer(), nullable=False),
        sa.Column("payment_terms_days", sa.Integer(), nullable=False),
        sa.Column("quote_prefix", sa.Text(), nullable=False),
        sa.Column("invoice_prefix", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_by", sa.Text(), nullable=True),
        sa.CheckConstraint(sa.column("id") == 1, name=op.f("ck_company_settings_one_row")),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name=op.f("fk_company_settings_updated_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_company_settings")),
        sqlite_autoincrement=True,
    )
    op.create_index(op.f("ix_company_settings_updated_by"), "company_settings", ["updated_by"], unique=False)
    now = datetime.now(UTC).replace(tzinfo=None)
    op.bulk_insert(settings, [{**STARTING_SETTINGS, "created_at": now, "updated_at": now}])

    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index(op.f("ix_company_settings_updated_by"), table_name="company_settings")
    op.drop_table("company_settings")
