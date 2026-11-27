"""Products: the price list, with unique names and prices in whole cents.

It adds no rows, so a database the team already uses gets an empty price list
rather than made-up products among its records (M8). On Postgres, the new table
gets row-level security like every other.

Revision ID: 0004
Revises: 0003
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

# $1,000,000.00. Written out here, so a later change to the app's limit can't change what this migration built.
MAX_PRICE_CENTS = 100_000_000


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("name_key", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.Text(), nullable=True),
        sa.CheckConstraint(
            sa.column("unit_price_cents").between(0, MAX_PRICE_CENTS), name=op.f("ck_products_price_in_range")
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_products_created_by_users")),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name=op.f("fk_products_updated_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
        sqlite_autoincrement=True,
    )
    op.create_index(op.f("ix_products_name_key"), "products", ["name_key"], unique=True)
    op.create_index(op.f("ix_products_created_by"), "products", ["created_by"], unique=False)
    op.create_index(op.f("ix_products_updated_by"), "products", ["updated_by"], unique=False)

    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TABLE products ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index(op.f("ix_products_updated_by"), table_name="products")
    op.drop_index(op.f("ix_products_created_by"), table_name="products")
    op.drop_index(op.f("ix_products_name_key"), table_name="products")
    op.drop_table("products")
