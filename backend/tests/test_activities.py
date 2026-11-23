def test_activity_must_belong_to_exactly_one_record(api, client):
    c = api.contact()
    d = api.deal()
    base = {"type": "call", "description": "Hi", "occurred_at": "2026-11-20T10:00:00"}
    for ids in ({}, {"contact_id": c["id"], "deal_id": d["id"]}):
        r = client.post("/api/activities", json={**base, **ids})
        assert r.status_code == 422
        assert r.json()["errors"] == {"record": "Choose a contact or a deal"}


def test_description_is_required(api, client):
    c = api.contact()
    r = client.post(
        "/api/activities",
        json={
            "type": "note",
            "description": "  ",
            "occurred_at": "2026-11-20T10:00:00",
            "contact_id": c["id"],
        },
    )
    assert r.status_code == 422
    assert r.json()["errors"] == {"description": "Describe what happened"}


def test_bad_type_and_missing_time(api, client):
    c = api.contact()
    r = client.post(
        "/api/activities", json={"type": "fax", "description": "x", "contact_id": c["id"]}
    )
    assert r.status_code == 422
    assert r.json()["errors"] == {
        "type": "Choose note, call or email",
        "occurred_at": "Enter when it happened",
    }


def test_edit_delete_and_mark_done(api, client):
    c = api.contact()
    a = api.activity(contact_id=c["id"], follow_up_date="2026-11-25")
    assert a["follow_up_done"] is False
    r = client.put(
        f"/api/activities/{a['id']}",
        json={
            "type": "email",
            "description": "Emailed instead",
            "occurred_at": "2026-11-21T09:00:00",
            "contact_id": c["id"],
            "follow_up_date": "2026-11-26",
        },
    )
    assert r.status_code == 200
    assert r.json()["type"] == "email" and r.json()["follow_up_date"] == "2026-11-26"
    done = client.post(f"/api/activities/{a['id']}/done", json={"done": True}).json()
    assert done["follow_up_done"] is True
    undone = client.post(f"/api/activities/{a['id']}/done", json={"done": False}).json()
    assert undone["follow_up_done"] is False
    assert client.delete(f"/api/activities/{a['id']}").status_code == 204
    assert api.get(f"/api/contacts/{c['id']}")["timeline"] == []
    assert client.delete(f"/api/activities/{a['id']}").status_code == 404


def test_activity_on_missing_record_gives_422(client):
    r = client.post(
        "/api/activities",
        json={
            "type": "call",
            "description": "x",
            "occurred_at": "2026-11-20T10:00:00",
            "deal_id": 77,
        },
    )
    assert r.status_code == 422 and "record" in r.json()["errors"]
