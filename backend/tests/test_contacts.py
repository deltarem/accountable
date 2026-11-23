def test_create_without_organization(api):
    c = api.contact()
    assert c["organization_id"] is None and c["organization_name"] is None


def test_status_defaults_to_lead(api):
    assert api.contact()["status"] == "lead"


def test_bad_email_gives_422(client):
    r = client.post("/api/contacts", json={"name": "Maria", "email": "maria-at-acme"})
    assert r.status_code == 422
    assert r.json()["errors"] == {"email": "Enter an email like name@company.com"}


def test_missing_name_gives_422(client):
    r = client.post("/api/contacts", json={"email": "a@b.co"})
    assert r.status_code == 422
    assert r.json()["errors"]["name"] == "Enter a name"


def test_unknown_organization_gives_422(client):
    r = client.post("/api/contacts", json={"name": "Maria", "organization_id": 999})
    assert r.status_code == 422
    assert "organization_id" in r.json()["errors"]


def test_list_has_status_and_organization_name_for_filtering(api):
    org = api.org("Acme Ltd")
    api.contact("A", status="lead", organization_id=org["id"])
    api.contact("B", status="qualified")
    api.contact("C", status="customer")
    rows = api.get("/api/contacts")
    assert [r["status"] for r in rows] == ["lead", "qualified", "customer"]
    assert rows[0]["organization_name"] == "Acme Ltd"
    assert [r["name"] for r in rows if r["status"] == "qualified"] == ["B"]


def test_status_change_by_hand_writes_event(api, client):
    c = api.contact()
    r = client.put(f"/api/contacts/{c['id']}", json={"name": c["name"], "status": "qualified"})
    assert r.status_code == 200
    timeline = api.get(f"/api/contacts/{c['id']}")["timeline"]
    assert len(timeline) == 1
    assert timeline[0]["kind"] == "status_change"
    assert (timeline[0]["from_value"], timeline[0]["to_value"]) == ("lead", "qualified")


def test_edit_without_status_change_writes_no_event(api, client):
    c = api.contact()
    client.put(f"/api/contacts/{c['id']}", json={"name": "Maria L", "status": "lead"})
    assert api.get(f"/api/contacts/{c['id']}")["timeline"] == []


def test_missing_contact_gives_404(client):
    assert client.get("/api/contacts/42").status_code == 404
