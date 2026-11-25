"""The tables as they were before migrations: organizations, contacts, deals,
activities and events (DM-01 to DM-05).

Written out in full rather than imported from db.py, so later changes to the
tables can't change what this migration does.

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _stamps():
    return [
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("website", sa.String(500)),
        sa.Column("industry", sa.String(200)),
        sa.Column("notes", sa.Text()),
        *_stamps(),
    )
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(100)),
        sa.Column("job_title", sa.String(200)),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id")),
        sa.Column("status", sa.String(20), nullable=False),
        *_stamps(),
    )
    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id")),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id")),
        sa.Column("stage", sa.String(20), nullable=False),
        sa.Column("value_cents", sa.Integer(), nullable=False),
        sa.Column("probability", sa.Integer(), nullable=False),
        sa.Column("close_date", sa.Date()),
        sa.Column("position", sa.Integer(), nullable=False),
        *_stamps(),
    )
    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id")),
        sa.Column("deal_id", sa.Integer(), sa.ForeignKey("deals.id")),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("follow_up_date", sa.Date()),
        sa.Column("follow_up_done", sa.Boolean(), nullable=False),
        *_stamps(),
        sa.CheckConstraint(
            "(contact_id IS NOT NULL AND deal_id IS NULL)"
            " OR (contact_id IS NULL AND deal_id IS NOT NULL)",
            name="activity_has_one_record",
        ),
    )
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("deal_id", sa.Integer(), sa.ForeignKey("deals.id")),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id")),
        sa.Column("from_value", sa.String(20)),
        sa.Column("to_value", sa.String(20)),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        *_stamps(),
    )


def downgrade() -> None:
    for table in ("events", "activities", "deals", "contacts", "organizations"):
        op.drop_table(table)
