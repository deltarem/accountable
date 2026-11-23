"""Deals: create and update with the stage rules, move, delete (API-08 to API-11)."""

from sqlalchemy import delete, func, insert, select, update

from backend import clock, db
from backend.db import activities, contacts, deals, events, organizations
from backend.money import expected_cents
from backend.schemas import DealIn
from backend.services.common import ValidationFailed, exists, one
from backend.services.stages import (
    ORDER,
    STAGES,
    apply_stage_change,
    is_late,
    make_customer,
)
from backend.services.timeline import deal_timeline


def _query():
    return select(
        deals,
        organizations.c.name.label("organization_name"),
        contacts.c.name.label("contact_name"),
    ).select_from(
        deals.outerjoin(organizations, deals.c.organization_id == organizations.c.id).outerjoin(
            contacts, deals.c.contact_id == contacts.c.id
        )
    )


def _decorate(row, today) -> dict:
    d = dict(row)
    d["late"] = is_late(d["stage"], d["close_date"], today)
    d["expected_cents"] = expected_cents(d["value_cents"], d["probability"])
    return d


def list_deals() -> list[dict]:
    today = clock.today()
    with db.reading() as conn:
        rows = conn.execute(_query()).mappings().all()
    items = [_decorate(r, today) for r in rows]
    return sorted(items, key=lambda d: (ORDER.index(d["stage"]), d["position"], d["id"]))


def get_deal(deal_id: int) -> dict:
    with db.reading() as conn:
        row = conn.execute(_query().where(deals.c.id == deal_id)).mappings().first()
        if row is None:
            one(conn, deals, deal_id, "deal")
        deal = _decorate(row, clock.today())
        deal["timeline"] = deal_timeline(conn, deal_id)
        return deal


def _check_links(conn, data: DealIn) -> None:
    errors = {}
    if data.organization_id is not None and not exists(conn, organizations, data.organization_id):
        errors["organization_id"] = "That organization no longer exists"
    if data.contact_id is not None and not exists(conn, contacts, data.contact_id):
        errors["contact_id"] = "That contact no longer exists"
    if errors:
        raise ValidationFailed(errors)


def column_ids(conn, stage: str, exclude: int | None = None) -> list[int]:
    q = select(deals.c.id).where(deals.c.stage == stage).order_by(deals.c.position, deals.c.id)
    return [i for i in conn.execute(q).scalars() if i != exclude]


def write_positions(conn, ids: list[int]) -> None:
    """Renumber a column 0 to n-1 in the given order (ARC-08)."""
    current = (
        dict(conn.execute(select(deals.c.id, deals.c.position).where(deals.c.id.in_(ids))).all())
        if ids
        else {}
    )
    for position, deal_id in enumerate(ids):
        if current.get(deal_id) != position:
            conn.execute(update(deals).where(deals.c.id == deal_id).values(position=position))


def create_deal(data: DealIn) -> dict:
    """RULE-01: a new deal takes its stage's probability unless one is given.
    It goes to the top of its column."""
    at = clock.now()
    values = data.model_dump()
    stage = values["stage"]
    if values["probability"] is None:
        values["probability"] = STAGES[stage].probability
    if not STAGES[stage].open and values["close_date"] is None:
        values["close_date"] = clock.today()
    with db.transaction() as conn:
        _check_links(conn, data)
        others = column_ids(conn, stage)
        new_id = conn.execute(
            insert(deals).values(**values, position=0, created_at=at, updated_at=at)
        ).inserted_primary_key[0]
        write_positions(conn, [new_id, *others])
        if stage == "won":
            make_customer(conn, values["contact_id"], at)
    return get_deal(new_id)


def update_deal(deal_id: int, data: DealIn) -> dict:
    """RULE-02, RULE-03, DEC-07: a stage change goes through apply_stage_change.

    When the stage changes, a probability or close date that is still the old
    one counts as "not chosen", so the stage's usual figure and today apply.
    Without a stage change, a probability set by hand is kept.
    """
    at = clock.now()
    with db.transaction() as conn:
        current = one(conn, deals, deal_id, "deal")
        _check_links(conn, data)
        values = data.model_dump()
        new_stage = values.pop("stage")
        probability = values.pop("probability")
        close_date = values.pop("close_date")
        plain = {**values, "updated_at": at}
        if new_stage == current["stage"]:
            plain["probability"] = current["probability"] if probability is None else probability
            plain["close_date"] = close_date
            conn.execute(update(deals).where(deals.c.id == deal_id).values(**plain))
        else:
            chosen_probability = (
                None if probability in (None, current["probability"]) else probability
            )
            if STAGES[new_stage].open:
                # Reopening keeps whatever date the form sends (DEC-07).
                plain["close_date"] = close_date
                chosen_date = None
            else:
                chosen_date = None if close_date in (None, current["close_date"]) else close_date
            conn.execute(update(deals).where(deals.c.id == deal_id).values(**plain))
            apply_stage_change(
                conn,
                {**current, **values},
                new_stage,
                probability=chosen_probability,
                close_date=chosen_date,
            )
            write_positions(conn, column_ids(conn, current["stage"], exclude=deal_id))
            write_positions(conn, [deal_id, *column_ids(conn, new_stage, exclude=deal_id)])
    return get_deal(deal_id)


def move_deal(deal_id: int, stage: str, index: int) -> dict:
    """API-11: put the card at that stage and place, renumber, apply the stage rules."""
    with db.transaction() as conn:
        current = one(conn, deals, deal_id, "deal")
        target = column_ids(conn, stage, exclude=deal_id)
        index = max(0, min(index, len(target)))
        target.insert(index, deal_id)
        if stage != current["stage"]:
            apply_stage_change(conn, current, stage)
            write_positions(conn, column_ids(conn, current["stage"], exclude=deal_id))
        write_positions(conn, target)
    return get_deal(deal_id)


def delete_impact(deal_id: int) -> dict:
    with db.reading() as conn:
        deal = one(conn, deals, deal_id, "deal")
        n_acts = conn.execute(
            select(func.count()).select_from(activities).where(activities.c.deal_id == deal_id)
        ).scalar_one()
        n_events = conn.execute(
            select(func.count()).select_from(events).where(events.c.deal_id == deal_id)
        ).scalar_one()
        return {"name": deal["name"], "activities": n_acts, "events": n_events}


def delete_deal(deal_id: int) -> None:
    """Deletes its activities and stage history (ARC-04)."""
    with db.transaction() as conn:
        current = one(conn, deals, deal_id, "deal")
        conn.execute(delete(activities).where(activities.c.deal_id == deal_id))
        conn.execute(delete(events).where(events.c.deal_id == deal_id))
        conn.execute(delete(deals).where(deals.c.id == deal_id))
        write_positions(conn, column_ids(conn, current["stage"]))
