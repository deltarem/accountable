"""The stage table and the one function that changes a deal's stage (ARC-02).

Both the deal form (PUT) and the board (move) call apply_stage_change, so the
probability, close date, event and customer change can't drift apart.
"""

from dataclasses import dataclass
from datetime import date

from sqlalchemy import insert, select, update

from backend import clock
from backend.db import contacts, deals, events


@dataclass(frozen=True)
class Stage:
    key: str
    name: str
    probability: int
    open: bool


STAGES = {
    s.key: s
    for s in [
        Stage("new", "New", 10, True),
        Stage("qualified", "Qualified", 25, True),
        Stage("proposal", "Proposal", 50, True),
        Stage("negotiation", "Negotiation", 75, True),
        Stage("won", "Won", 100, False),
        Stage("lost", "Lost", 0, False),
    ]
}
ORDER = list(STAGES)
OPEN_STAGES = [k for k in ORDER if STAGES[k].open]
CLOSED_STAGES = [k for k in ORDER if not STAGES[k].open]


def is_open(stage: str) -> bool:
    return STAGES[stage].open


def is_late(stage: str, close_date: date | None, today: date) -> bool:
    """RULE-06: open, with a close date before today."""
    return is_open(stage) and close_date is not None and close_date < today


def write_status_change(conn, contact: dict, new_status: str, at) -> None:
    conn.execute(
        update(contacts)
        .where(contacts.c.id == contact["id"])
        .values(status=new_status, updated_at=at)
    )
    conn.execute(
        insert(events).values(
            kind="status_change",
            contact_id=contact["id"],
            from_value=contact["status"],
            to_value=new_status,
            occurred_at=at,
            created_at=at,
            updated_at=at,
        )
    )


def make_customer(conn, contact_id: int | None, at) -> None:
    """RULE-05 and DEC-08: winning makes the main contact a customer, once."""
    if contact_id is None:
        return
    row = conn.execute(select(contacts).where(contacts.c.id == contact_id)).mappings().first()
    if row is None or row["status"] == "customer":
        return
    write_status_change(conn, dict(row), "customer", at)


def apply_stage_change(
    conn,
    deal: dict,
    new_stage: str,
    *,
    probability: int | None = None,
    close_date: date | None = None,
) -> dict:
    """Move a deal to a new stage and apply every stage rule.

    probability: a figure chosen in the form; None means the stage's usual one.
    close_date: a date chosen in the form when closing; None means today.
    Returns the values written to the deal ({} when the stage is unchanged).
    """
    old_stage = deal["stage"]
    if new_stage == old_stage:
        return {}
    at = clock.now()
    values = {
        "stage": new_stage,
        "probability": STAGES[new_stage].probability if probability is None else probability,
        "updated_at": at,
    }
    if not STAGES[new_stage].open:
        values["close_date"] = close_date or clock.today()
    elif close_date is not None:
        values["close_date"] = close_date
    conn.execute(update(deals).where(deals.c.id == deal["id"]).values(**values))
    conn.execute(
        insert(events).values(
            kind="stage_change",
            deal_id=deal["id"],
            from_value=old_stage,
            to_value=new_stage,
            occurred_at=at,
            created_at=at,
            updated_at=at,
        )
    )
    if new_stage == "won":
        make_customer(conn, deal.get("contact_id"), at)
    return values
