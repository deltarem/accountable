"""Contacts (API-05 to API-07)."""

from sqlalchemy import delete, func, insert, select, update

from backend import clock, db
from backend.db import activities, contacts, deals, events, organizations
from backend.schemas import ContactIn
from backend.services.common import ValidationFailed, exists, one
from backend.services.stages import ORDER, write_status_change
from backend.services.timeline import contact_timeline
from backend.services.users import name_map, with_names


def _query():
    return select(contacts, organizations.c.name.label("organization_name")).select_from(
        contacts.outerjoin(organizations, contacts.c.organization_id == organizations.c.id)
    )


def list_contacts() -> list[dict]:
    with db.reading() as conn:
        rows = conn.execute(_query().order_by(func.lower(contacts.c.name))).mappings().all()
        names = name_map(conn)
        return [with_names(dict(r), names) for r in rows]


def get_contact(contact_id: int) -> dict:
    with db.reading() as conn:
        row = conn.execute(_query().where(contacts.c.id == contact_id)).mappings().first()
        if row is None:
            one(conn, contacts, contact_id, "contact")
        contact = with_names(dict(row), name_map(conn))
        contact_deals = [
            dict(r)
            for r in conn.execute(
                select(
                    deals.c.id,
                    deals.c.name,
                    deals.c.stage,
                    deals.c.value_cents,
                    organizations.c.name.label("organization_name"),
                )
                .select_from(
                    deals.outerjoin(organizations, deals.c.organization_id == organizations.c.id)
                )
                .where(deals.c.contact_id == contact_id)
            ).mappings()
        ]
        contact["deals"] = sorted(
            contact_deals, key=lambda d: (ORDER.index(d["stage"]), d["name"].lower())
        )
        contact["timeline"] = contact_timeline(conn, contact_id)
        return contact


def _check_links(conn, data: ContactIn) -> None:
    if data.organization_id is not None and not exists(conn, organizations, data.organization_id):
        raise ValidationFailed({"organization_id": "That organization no longer exists"})


def create_contact(data: ContactIn, user_id: str) -> dict:
    at = clock.now()
    with db.transaction() as conn:
        _check_links(conn, data)
        new_id = conn.execute(
            insert(contacts).values(
                **data.model_dump(),
                created_at=at,
                updated_at=at,
                created_by=user_id,
                updated_by=user_id,
            )
        ).inserted_primary_key[0]
    return get_contact(new_id)


def update_contact(contact_id: int, data: ContactIn, user_id: str) -> dict:
    """A change of status, by hand, writes a status-change event (DEC-09)."""
    at = clock.now()
    with db.transaction() as conn:
        current = one(conn, contacts, contact_id, "contact")
        _check_links(conn, data)
        values = data.model_dump()
        new_status = values.pop("status")
        conn.execute(
            update(contacts)
            .where(contacts.c.id == contact_id)
            .values(**values, updated_at=at, updated_by=user_id)
        )
        if new_status != current["status"]:
            write_status_change(conn, current, new_status, at, user_id)
    return get_contact(contact_id)


def delete_impact(contact_id: int) -> dict:
    with db.reading() as conn:
        contact = one(conn, contacts, contact_id, "contact")
        n_acts = conn.execute(
            select(func.count())
            .select_from(activities)
            .where(activities.c.contact_id == contact_id)
        ).scalar_one()
        n_deals = conn.execute(
            select(func.count()).select_from(deals).where(deals.c.contact_id == contact_id)
        ).scalar_one()
        return {"name": contact["name"], "activities": n_acts, "deals": n_deals}


def delete_contact(contact_id: int) -> None:
    """Deletes their activities and status events; their deals lose the main contact."""
    at = clock.now()
    with db.transaction() as conn:
        one(conn, contacts, contact_id, "contact")
        conn.execute(delete(activities).where(activities.c.contact_id == contact_id))
        conn.execute(delete(events).where(events.c.contact_id == contact_id))
        conn.execute(
            update(deals)
            .where(deals.c.contact_id == contact_id)
            .values(contact_id=None, updated_at=at)
        )
        conn.execute(delete(contacts).where(contacts.c.id == contact_id))
