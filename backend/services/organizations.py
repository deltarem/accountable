"""Organizations: create, read, update, delete, list with counts (API-01 to API-04)."""

from sqlalchemy import delete, func, insert, select, update

from backend import clock, db
from backend.db import contacts, deals, organizations
from backend.schemas import OrganizationIn
from backend.services.common import one
from backend.services.stages import OPEN_STAGES, ORDER
from backend.services.timeline import organization_timeline


def _with_counts(conn, rows) -> list[dict]:
    contact_counts = dict(
        conn.execute(
            select(contacts.c.organization_id, func.count()).group_by(contacts.c.organization_id)
        ).all()
    )
    open_rows = conn.execute(
        select(
            deals.c.organization_id, func.count(), func.coalesce(func.sum(deals.c.value_cents), 0)
        )
        .where(deals.c.stage.in_(OPEN_STAGES))
        .group_by(deals.c.organization_id)
    ).all()
    open_counts = {r[0]: (r[1], r[2]) for r in open_rows}
    out = []
    for row in rows:
        item = dict(row)
        item["contact_count"] = contact_counts.get(item["id"], 0)
        count, value = open_counts.get(item["id"], (0, 0))
        item["open_deal_count"] = count
        item["open_value_cents"] = int(value)
        out.append(item)
    return out


def list_organizations() -> list[dict]:
    with db.reading() as conn:
        rows = (
            conn.execute(select(organizations).order_by(func.lower(organizations.c.name)))
            .mappings()
            .all()
        )
        return _with_counts(conn, rows)


def get_organization(org_id: int) -> dict:
    with db.reading() as conn:
        org = _with_counts(conn, [one(conn, organizations, org_id, "organization")])[0]
        org["contacts"] = [
            dict(r)
            for r in conn.execute(
                select(contacts.c.id, contacts.c.name, contacts.c.job_title, contacts.c.status)
                .where(contacts.c.organization_id == org_id)
                .order_by(func.lower(contacts.c.name))
            ).mappings()
        ]
        org_deals = [
            dict(r)
            for r in conn.execute(
                select(deals.c.id, deals.c.name, deals.c.stage, deals.c.value_cents).where(
                    deals.c.organization_id == org_id
                )
            ).mappings()
        ]
        org["deals"] = sorted(org_deals, key=lambda d: (ORDER.index(d["stage"]), d["name"].lower()))
        org["timeline"] = organization_timeline(conn, org_id)
        return org


def create_organization(data: OrganizationIn) -> dict:
    at = clock.now()
    with db.transaction() as conn:
        new_id = conn.execute(
            insert(organizations).values(**data.model_dump(), created_at=at, updated_at=at)
        ).inserted_primary_key[0]
    return get_organization(new_id)


def update_organization(org_id: int, data: OrganizationIn) -> dict:
    with db.transaction() as conn:
        one(conn, organizations, org_id, "organization")
        conn.execute(
            update(organizations)
            .where(organizations.c.id == org_id)
            .values(**data.model_dump(), updated_at=clock.now())
        )
    return get_organization(org_id)


def delete_impact(org_id: int) -> dict:
    with db.reading() as conn:
        org = one(conn, organizations, org_id, "organization")
        n_contacts = conn.execute(
            select(func.count()).select_from(contacts).where(contacts.c.organization_id == org_id)
        ).scalar_one()
        n_deals = conn.execute(
            select(func.count()).select_from(deals).where(deals.c.organization_id == org_id)
        ).scalar_one()
        return {"name": org["name"], "contacts": n_contacts, "deals": n_deals}


def delete_organization(org_id: int) -> None:
    """Contacts and deals are kept, with no organization (DEC-01, ARC-04)."""
    at = clock.now()
    with db.transaction() as conn:
        one(conn, organizations, org_id, "organization")
        conn.execute(
            update(contacts)
            .where(contacts.c.organization_id == org_id)
            .values(organization_id=None, updated_at=at)
        )
        conn.execute(
            update(deals)
            .where(deals.c.organization_id == org_id)
            .values(organization_id=None, updated_at=at)
        )
        conn.execute(delete(organizations).where(organizations.c.id == org_id))


def industries() -> list[str]:
    with db.reading() as conn:
        values = conn.execute(select(organizations.c.industry).distinct()).scalars().all()
    cleaned = {v.strip() for v in values if v and v.strip()}
    return sorted(cleaned, key=str.lower)
