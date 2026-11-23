def test_create_with_only_a_name(api):
    org = api.org("Northwind Traders")
    assert org["name"] == "Northwind Traders"
    assert org["website"] is None and org["industry"] is None and org["notes"] is None


def test_missing_or_blank_name_gives_422_for_name(client):
    for body in ({}, {"name": ""}, {"name": "   "}):
        r = client.post("/api/organizations", json=body)
        assert r.status_code == 422
        assert r.json()["errors"] == {"name": "Enter a name"}


def test_website_gets_https(api):
    assert api.org(website="acme.example")["website"] == "https://acme.example"
    assert api.org("B", website="http://b.example")["website"] == "http://b.example"


def test_list_includes_counts_and_open_value(api):
    org = api.org()
    api.contact(organization_id=org["id"])
    api.contact("Tom", organization_id=org["id"])
    api.deal(organization_id=org["id"], value_cents=1000_00)
    api.deal("Second", organization_id=org["id"], value_cents=250_00, stage="proposal")
    api.deal("Won one", organization_id=org["id"], value_cents=999_00, stage="won")
    row = next(o for o in api.get("/api/organizations") if o["id"] == org["id"])
    assert row["contact_count"] == 2
    assert row["open_deal_count"] == 2
    assert row["open_value_cents"] == 1250_00


def test_edit(api, client):
    org = api.org()
    r = client.put(f"/api/organizations/{org['id']}", json={"name": "Acme Group", "industry": "Software"})
    assert r.status_code == 200
    assert api.get(f"/api/organizations/{org['id']}")["name"] == "Acme Group"
    assert api.get(f"/api/organizations/{org['id']}")["industry"] == "Software"


def test_missing_record_gives_404(client):
    assert client.get("/api/organizations/999").status_code == 404
    assert client.put("/api/organizations/999", json={"name": "X"}).status_code == 404
    assert client.delete("/api/organizations/999").status_code == 404
    assert client.get("/api/organizations/999/delete-impact").status_code == 404


def test_detail_lists_contacts_and_deals(api):
    org = api.org()
    c = api.contact(organization_id=org["id"], job_title="CFO")
    d = api.deal(organization_id=org["id"])
    detail = api.get(f"/api/organizations/{org['id']}")
    assert [x["id"] for x in detail["contacts"]] == [c["id"]]
    assert [x["id"] for x in detail["deals"]] == [d["id"]]
    assert detail["timeline"] == []
