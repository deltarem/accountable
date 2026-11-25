"""The search in the top bar (DEC-21, API-21, ARC-20).

It reads the id, name and context of every organization, contact and deal, then
matches and orders them here in Python. SQLite's lower() and LIKE fold case for A
to Z only while Postgres folds every letter, so matching in SQL would give
different results on the two. A few hundred names take a millisecond or two.
"""

from sqlalchemy import select

from backend import db
from backend.db import contacts, deals, organizations
from backend.services.stages import STAGES

PER_GROUP = 5


def _matches(rows: list[dict], text: str) -> list[dict]:
    """Names containing the text, ignoring case; those that start with it first,
    then the rest, each A to Z. Plain text: % and _ are characters like any other."""
    found = [r for r in rows if text in r["name"].casefold()]
    found.sort(
        key=lambda r: (not r["name"].casefold().startswith(text), r["name"].casefold(), r["id"])
    )
    return [{"id": r["id"], "name": r["name"], "context": r["context"]} for r in found[:PER_GROUP]]


def _rows(conn) -> tuple[list[dict], list[dict], list[dict]]:
    org_names = dict(conn.execute(select(organizations.c.id, organizations.c.name)).all())
    orgs = [
        {"id": r.id, "name": r.name, "context": r.industry}
        for r in conn.execute(
            select(organizations.c.id, organizations.c.name, organizations.c.industry)
        )
    ]
    people = [
        {
            "id": r.id,
            "name": r.name,
            "context": org_names.get(r.organization_id) or "No organization",
        }
        for r in conn.execute(select(contacts.c.id, contacts.c.name, contacts.c.organization_id))
    ]
    deal_rows = []
    for r in conn.execute(select(deals.c.id, deals.c.name, deals.c.organization_id, deals.c.stage)):
        stage = STAGES[r.stage].name
        org = org_names.get(r.organization_id)
        deal_rows.append(
            {"id": r.id, "name": r.name, "context": f"{org} · {stage}" if org else stage}
        )
    return orgs, people, deal_rows


def search(q: str) -> dict:
    """Up to 5 of each kind whose name contains q. A blank q finds nothing."""
    text = q.strip().casefold()
    if not text:
        return {"organizations": [], "contacts": [], "deals": []}
    with db.reading() as conn:
        orgs, people, deal_rows = _rows(conn)
    return {
        "organizations": _matches(orgs, text),
        "contacts": _matches(people, text),
        "deals": _matches(deal_rows, text),
    }
