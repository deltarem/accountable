"""Who added and last changed each record, and who made each change (DM-08, SEED-07,
UI-WHO-01, UI-WHO-02). Priya Shah is `client`; Sam Lee is `other_client`."""

import pytest
from sqlalchemy import select

from backend import db
from backend.db import events
from backend.seed import seed_database
from backend.tests.conftest import Api


@pytest.fixture
def sam(other_client):
    return Api(other_client)


def authors(record):
    return record["created_by_name"], record["updated_by_name"]


def test_adding_sets_both_authors(api):
    org = api.org()
    contact = api.contact(organization_id=org["id"])
    deal = api.deal(organization_id=org["id"], contact_id=contact["id"])
    activity = api.activity(deal_id=deal["id"])
    for record in (org, contact, deal, activity):
        assert authors(record) == ("Priya Shah", "Priya Shah")
        assert (record["created_by"], record["updated_by"]) == ("user-priya", "user-priya")


def test_saving_changes_who_last_changed_it(api, sam):
    org = api.org()
    contact = api.contact()
    deal = api.deal(organization_id=org["id"])
    activity = api.activity(contact_id=contact["id"])

    org = sam.ok(sam.c.put(f"/api/organizations/{org['id']}", json={"name": "Acme Group"}))
    contact = sam.ok(sam.c.put(f"/api/contacts/{contact['id']}", json={"name": "Maria L."}))
    deal = sam.put_deal(deal, name="Acme renewal 2027")
    body = {"type": "note", "description": "Edited", "occurred_at": "2026-11-20T10:00:00"}
    activity = sam.ok(
        sam.c.put(f"/api/activities/{activity['id']}", json={**body, "contact_id": contact["id"]})
    )
    for record in (org, contact, deal, activity):
        assert authors(record) == ("Priya Shah", "Sam Lee")


def test_lists_carry_the_names_too(api):
    api.deal()
    api.contact()
    for path in ("/api/organizations", "/api/contacts", "/api/deals"):
        [first, *_] = api.get(path)
        assert authors(first) == ("Priya Shah", "Priya Shah"), path


def test_a_move_on_the_board_counts_as_a_change(api, sam):
    deal = api.deal()
    moved = sam.move(deal["id"], "new", 0)
    assert authors(moved) == ("Priya Shah", "Sam Lee")


def test_ticking_a_follow_up_counts_as_a_change(api, sam):
    contact = api.contact()
    activity = api.activity(contact_id=contact["id"], follow_up_date="2026-11-25")
    done = sam.ok(sam.c.post(f"/api/activities/{activity['id']}/done", json={"done": True}))
    assert authors(done) == ("Priya Shah", "Sam Lee")


def test_logging_an_activity_doesnt_change_its_record(api, sam):
    contact = api.contact()
    deal = api.deal(contact_id=contact["id"])
    sam.activity(deal_id=deal["id"])
    sam.activity(contact_id=contact["id"])
    assert authors(api.get(f"/api/deals/{deal['id']}")) == ("Priya Shah", "Priya Shah")
    assert authors(api.get(f"/api/contacts/{contact['id']}")) == ("Priya Shah", "Priya Shah")


def test_a_stage_change_records_who_made_it(api, sam):
    deal = api.deal()
    sam.move(deal["id"], "qualified", 0)
    api.put_deal(api.get(f"/api/deals/{deal['id']}"), stage="proposal")
    entries = api.get(f"/api/deals/{deal['id']}")["timeline"]
    assert [(e["to_value"], e["created_by_name"]) for e in entries] == [
        ("proposal", "Priya Shah"),
        ("qualified", "Sam Lee"),
    ]


def test_a_win_records_the_winner_on_both_events(api, sam):
    contact = api.contact()
    deal = api.deal(contact_id=contact["id"])
    sam.move(deal["id"], "won", 0)
    contact_after = api.get(f"/api/contacts/{contact['id']}")
    assert contact_after["status"] == "customer"
    assert authors(contact_after) == ("Priya Shah", "Sam Lee")
    with db.reading() as conn:
        rows = conn.execute(select(events.c.kind, events.c.created_by)).all()
    assert sorted(rows) == [("stage_change", "user-sam"), ("status_change", "user-sam")]
    status = [e for e in contact_after["timeline"] if e["kind"] == "status_change"]
    assert [e["created_by_name"] for e in status] == ["Sam Lee"]


def test_a_status_change_by_hand_records_who_made_it(api, sam):
    contact = api.contact()
    sam.ok(
        sam.c.put(
            f"/api/contacts/{contact['id']}", json={"name": contact["name"], "status": "qualified"}
        )
    )
    [entry] = api.get(f"/api/contacts/{contact['id']}")["timeline"]
    assert (entry["kind"], entry["created_by_name"]) == ("status_change", "Sam Lee")


def test_an_activity_entry_names_who_added_it_not_who_edited_it(api, sam):
    contact = api.contact()
    activity = api.activity(contact_id=contact["id"])
    body = {"type": "call", "description": "Edited", "occurred_at": "2026-11-20T10:00:00"}
    sam.ok(
        sam.c.put(f"/api/activities/{activity['id']}", json={**body, "contact_id": contact["id"]})
    )
    [entry] = api.get(f"/api/contacts/{contact['id']}")["timeline"]
    assert entry["created_by_name"] == "Priya Shah"
    assert "created_by" not in entry


def test_timelines_and_the_dashboard_carry_names(api, sam):
    org = api.org()
    contact = api.contact(organization_id=org["id"])
    deal = sam.deal(organization_id=org["id"], contact_id=contact["id"])
    sam.activity(deal_id=deal["id"], follow_up_date="2026-11-24")
    org_timeline = api.get(f"/api/organizations/{org['id']}")["timeline"]
    assert [e["created_by_name"] for e in org_timeline] == ["Sam Lee"]
    dashboard = api.get("/api/dashboard")
    assert [e["created_by_name"] for e in dashboard["recent_activity"]] == ["Sam Lee"]
    assert [e["created_by_name"] for e in dashboard["follow_ups"]] == ["Sam Lee"]


def test_sample_data_has_no_author(client, api):
    seed_database()
    deal = api.get("/api/deals")[0]
    assert authors(deal) == (None, None)
    assert authors(api.get("/api/organizations")[0]) == (None, None)
    assert authors(api.get("/api/contacts")[0]) == (None, None)
    full = api.get(f"/api/deals/{deal['id']}")
    assert all(e["created_by_name"] is None for e in full["timeline"])
    recent = api.get("/api/dashboard")["recent_activity"]
    assert recent and all(e["created_by_name"] is None for e in recent)
