"""Timelines, worked out when read (TL-01 to TL-04, ARC-07).

An entry is an activity or an event. Entries rolled up from another record
carry a `source` naming it, so the screen can say "on deal Acme renewal".
"""

from sqlalchemy import select

from backend.db import activities, contacts, deals, events, organizations


def name_maps(conn):
    deal_rows = conn.execute(
        select(deals.c.id, deals.c.name, deals.c.stage, deals.c.organization_id, deals.c.contact_id)
    ).mappings()
    deal_map = {r["id"]: dict(r) for r in deal_rows}
    contact_map = {
        r["id"]: dict(r)
        for r in conn.execute(select(contacts.c.id, contacts.c.name, contacts.c.organization_id)).mappings()
    }
    org_map = dict(conn.execute(select(organizations.c.id, organizations.c.name)).all())
    return deal_map, contact_map, org_map


def activity_entry(row) -> dict:
    return {
        "key": f"activity-{row['id']}",
        "kind": "activity",
        "id": row["id"],
        "type": row["type"],
        "description": row["description"],
        "from_value": None,
        "to_value": None,
        "occurred_at": row["occurred_at"],
        "follow_up_date": row["follow_up_date"],
        "follow_up_done": row["follow_up_done"],
        "deal_id": row["deal_id"],
        "contact_id": row["contact_id"],
    }


def event_entry(row) -> dict:
    return {
        "key": f"event-{row['id']}",
        "kind": row["kind"],
        "id": row["id"],
        "type": None,
        "description": None,
        "from_value": row["from_value"],
        "to_value": row["to_value"],
        "occurred_at": row["occurred_at"],
        "follow_up_date": None,
        "follow_up_done": False,
        "deal_id": row["deal_id"],
        "contact_id": row["contact_id"],
    }


def _deal_entries(conn, deal_ids) -> list[dict]:
    if not deal_ids:
        return []
    ids = list(deal_ids)
    acts = conn.execute(select(activities).where(activities.c.deal_id.in_(ids))).mappings()
    evs = conn.execute(
        select(events).where(events.c.deal_id.in_(ids), events.c.kind == "stage_change")
    ).mappings()
    return [activity_entry(r) for r in acts] + [event_entry(r) for r in evs]


def _contact_own_entries(conn, contact_ids) -> list[dict]:
    if not contact_ids:
        return []
    ids = list(contact_ids)
    acts = conn.execute(select(activities).where(activities.c.contact_id.in_(ids))).mappings()
    evs = conn.execute(
        select(events).where(events.c.contact_id.in_(ids), events.c.kind == "status_change")
    ).mappings()
    return [activity_entry(r) for r in acts] + [event_entry(r) for r in evs]


def _sorted(entries: list[dict]) -> list[dict]:
    return sorted(entries, key=lambda e: (e["occurred_at"], e["kind"] == "activity", e["id"]), reverse=True)


def _with_source(entries, deal_map, contact_map, skip_deal=None, skip_contact=None):
    for e in entries:
        if e["deal_id"] is not None and e["deal_id"] != skip_deal:
            d = deal_map.get(e["deal_id"])
            e["source"] = {"kind": "deal", "id": e["deal_id"], "name": d["name"] if d else ""}
        elif e["contact_id"] is not None and e["contact_id"] != skip_contact:
            c = contact_map.get(e["contact_id"])
            e["source"] = {"kind": "contact", "id": e["contact_id"], "name": c["name"] if c else ""}
        else:
            e["source"] = None
    return entries


def deal_timeline(conn, deal_id: int) -> list[dict]:
    """TL-01: the deal's activities and stage changes."""
    entries = _deal_entries(conn, [deal_id])
    for e in entries:
        e["source"] = None
    return _sorted(entries)


def contact_timeline(conn, contact_id: int) -> list[dict]:
    """TL-02: own activities and status changes, plus those of deals where
    they're the main contact now."""
    deal_map, contact_map, _ = name_maps(conn)
    deal_ids = [d["id"] for d in deal_map.values() if d["contact_id"] == contact_id]
    entries = _contact_own_entries(conn, [contact_id]) + _deal_entries(conn, deal_ids)
    return _sorted(_with_source(entries, deal_map, contact_map, skip_contact=contact_id))


def organization_timeline(conn, org_id: int) -> list[dict]:
    """TL-03: everything on its contacts' and deals' timelines, once each."""
    deal_map, contact_map, _ = name_maps(conn)
    contact_ids = [c["id"] for c in contact_map.values() if c["organization_id"] == org_id]
    deal_ids = {d["id"] for d in deal_map.values() if d["organization_id"] == org_id}
    deal_ids |= {d["id"] for d in deal_map.values() if d["contact_id"] in contact_ids}
    entries = _contact_own_entries(conn, contact_ids) + _deal_entries(conn, deal_ids)
    unique = {e["key"]: e for e in entries}
    return _sorted(_with_source(list(unique.values()), deal_map, contact_map))


def all_entries(conn) -> list[dict]:
    """Every entry across all timelines, each with the record it belongs to."""
    deal_map, contact_map, org_map = name_maps(conn)
    entries = [activity_entry(r) for r in conn.execute(select(activities)).mappings()]
    entries += [event_entry(r) for r in conn.execute(select(events)).mappings()]
    for e in entries:
        e["record"] = record_ref(e, deal_map, contact_map, org_map)
    return _sorted(entries)


def record_ref(e, deal_map, contact_map, org_map) -> dict | None:
    if e["deal_id"] is not None:
        d = deal_map.get(e["deal_id"])
        if d is None:
            return None
        return {
            "kind": "deal",
            "id": d["id"],
            "name": d["name"],
            "organization_name": org_map.get(d["organization_id"]),
        }
    if e["contact_id"] is not None:
        c = contact_map.get(e["contact_id"])
        if c is None:
            return None
        return {"kind": "contact", "id": c["id"], "name": c["name"], "organization_name": None}
    return None
