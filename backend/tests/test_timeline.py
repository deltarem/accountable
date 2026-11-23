def keys(timeline):
    return [e["key"] for e in timeline]


def test_deal_timeline_merges_activities_and_stage_changes_newest_first(api, monkeypatch):
    d = api.deal()
    api.activity("Old call", deal_id=d["id"], occurred_at="2026-11-01T09:00:00")
    api.move(d["id"], "qualified")  # at the fixed now, 23 Nov 14:00
    api.activity("Latest", deal_id=d["id"], occurred_at="2026-11-23T15:00:00")
    api.activity("Middle", deal_id=d["id"], occurred_at="2026-11-10T09:00:00")
    tl = api.get(f"/api/deals/{d['id']}")["timeline"]
    assert [e["description"] or e["kind"] for e in tl] == ["Latest", "stage_change", "Middle", "Old call"]
    assert all(e["source"] is None for e in tl)


def test_contact_timeline_includes_their_deals_labelled(api):
    c = api.contact()
    d = api.deal("Acme renewal", contact_id=c["id"])
    api.activity("Own note", type="note", contact_id=c["id"], occurred_at="2026-11-02T09:00:00")
    api.activity("Deal call", deal_id=d["id"], occurred_at="2026-11-03T09:00:00")
    api.move(d["id"], "proposal")
    tl = api.get(f"/api/contacts/{c['id']}")["timeline"]
    assert [e["kind"] for e in tl] == ["stage_change", "activity", "activity"]
    assert tl[0]["source"] == {"kind": "deal", "id": d["id"], "name": "Acme renewal"}
    assert tl[1]["source"]["name"] == "Acme renewal"
    assert tl[2]["source"] is None


def test_changing_main_contact_moves_entries(api):
    first = api.contact("First")
    second = api.contact("Second")
    d = api.deal(contact_id=first["id"])
    api.activity("Deal call", deal_id=d["id"])
    assert len(api.get(f"/api/contacts/{first['id']}")["timeline"]) == 1
    api.put_deal(d, contact_id=second["id"])
    assert api.get(f"/api/contacts/{first['id']}")["timeline"] == []
    assert len(api.get(f"/api/contacts/{second['id']}")["timeline"]) == 1


def test_organization_timeline_includes_everything_once(api):
    org = api.org()
    c = api.contact(organization_id=org["id"])
    # The deal belongs to the organization and has its contact as main contact,
    # so its entries reach the organization twice over; they show once.
    d = api.deal(organization_id=org["id"], contact_id=c["id"])
    api.activity("Contact note", contact_id=c["id"], occurred_at="2026-11-02T09:00:00")
    api.activity("Deal call", deal_id=d["id"], occurred_at="2026-11-03T09:00:00")
    api.move(d["id"], "won")
    tl = api.get(f"/api/organizations/{org['id']}")["timeline"]
    assert len(tl) == len(set(keys(tl))) == 4  # stage change, status change, 2 activities
    sources = {(e["kind"], e["source"]["kind"]) for e in tl}
    assert ("stage_change", "deal") in sources
    assert ("status_change", "contact") in sources


def test_organization_detail_has_timeline(api):
    org = api.org()
    d = api.deal(organization_id=org["id"])
    api.activity("On deal", deal_id=d["id"])
    detail = api.get(f"/api/organizations/{org['id']}")
    assert [e["description"] for e in detail["timeline"]] == ["On deal"]
    assert detail["timeline"][0]["source"]["kind"] == "deal"
