from sqlalchemy import func, select

from backend import db
from backend.db import activities, contacts, deals, events


def count(table, *where):
    with db.reading() as conn:
        return conn.execute(select(func.count()).select_from(table).where(*where)).scalar_one()


def test_deleting_organization_keeps_contacts_and_deals(api, client):
    org = api.org("Northwind Traders")
    c = api.contact(organization_id=org["id"])
    d = api.deal(organization_id=org["id"], contact_id=c["id"])
    impact = api.get(f"/api/organizations/{org['id']}/delete-impact")
    assert impact == {"name": "Northwind Traders", "contacts": 1, "deals": 1}
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert api.get(f"/api/contacts/{c['id']}")["organization_id"] is None
    deal = api.get(f"/api/deals/{d['id']}")
    assert deal["organization_id"] is None and deal["organization_name"] is None
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404


def test_deleting_contact_deletes_activities_and_events_keeps_deals(api, client):
    c = api.contact()
    other = api.contact("Other")
    d = api.deal(contact_id=c["id"])
    api.activity(contact_id=c["id"])
    api.activity("Second", contact_id=c["id"])
    api.activity("Theirs", contact_id=other["id"])
    deal_note = api.activity("On the deal", deal_id=d["id"])
    client.put(f"/api/contacts/{c['id']}", json={"name": c["name"], "status": "qualified"})
    impact = api.get(f"/api/contacts/{c['id']}/delete-impact")
    assert impact == {"name": "Maria Lopez", "activities": 2, "deals": 1}
    assert client.delete(f"/api/contacts/{c['id']}").status_code == 204
    assert count(activities, activities.c.contact_id == c["id"]) == 0
    assert count(events, events.c.contact_id == c["id"]) == 0
    assert count(activities, activities.c.contact_id == other["id"]) == 1
    assert count(activities, activities.c.id == deal_note["id"]) == 1
    assert api.get(f"/api/deals/{d['id']}")["contact_id"] is None


def test_deleting_deal_deletes_activities_and_events(api, client):
    d = api.deal()
    keep = api.deal("Keep", organization_id=d["organization_id"])
    api.activity(deal_id=d["id"])
    api.activity("Kept", deal_id=keep["id"])
    api.move(d["id"], "proposal")
    impact = api.get(f"/api/deals/{d['id']}/delete-impact")
    assert impact == {"name": "Acme renewal", "activities": 1, "events": 1}
    assert client.delete(f"/api/deals/{d['id']}").status_code == 204
    assert count(activities, activities.c.deal_id == d["id"]) == 0
    assert count(events, events.c.deal_id == d["id"]) == 0
    assert count(activities, activities.c.deal_id == keep["id"]) == 1
    assert count(deals) == 1


def test_impact_counts_match_what_delete_does(api, client):
    org = api.org()
    contacts_made = [api.contact(f"C{i}", organization_id=org["id"]) for i in range(3)]
    for i in range(2):
        api.deal(f"D{i}", organization_id=org["id"], contact_id=contacts_made[0]["id"])
    for i in range(4):
        api.activity(f"A{i}", contact_id=contacts_made[0]["id"])

    org_impact = api.get(f"/api/organizations/{org['id']}/delete-impact")
    before_unlinked = count(contacts, contacts.c.organization_id.is_(None))
    client.delete(f"/api/organizations/{org['id']}")
    assert (
        count(contacts, contacts.c.organization_id.is_(None)) - before_unlinked
        == org_impact["contacts"]
    )
    assert count(deals, deals.c.organization_id.is_(None)) == org_impact["deals"]

    c_impact = api.get(f"/api/contacts/{contacts_made[0]['id']}/delete-impact")
    acts_before = count(activities)
    client.delete(f"/api/contacts/{contacts_made[0]['id']}")
    assert acts_before - count(activities) == c_impact["activities"] == 4
    assert count(deals, deals.c.contact_id.is_(None)) == c_impact["deals"] == 2
