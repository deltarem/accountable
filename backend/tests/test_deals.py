def test_deal_needs_name_and_organization(client):
    r = client.post("/api/deals", json={})
    assert r.status_code == 422
    assert r.json()["errors"] == {
        "name": "Enter a name",
        "organization_id": "Choose an organization",
    }


def test_new_deal_takes_stage_probability(api):
    assert api.deal(stage="proposal")["probability"] == 50
    assert api.deal("Other")["probability"] == 10
    assert api.deal("Set", probability=33)["probability"] == 33


def test_negative_value_or_bad_probability_gives_422(api, client):
    org = api.org()
    r = client.post(
        "/api/deals", json={"name": "X", "organization_id": org["id"], "value_cents": -1}
    )
    assert r.status_code == 422 and r.json()["errors"] == {"value_cents": "Value can't be negative"}
    for p in (-1, 101, 120):
        r = client.post(
            "/api/deals", json={"name": "X", "organization_id": org["id"], "probability": p}
        )
        assert r.status_code == 422
        assert r.json()["errors"] == {"probability": "Probability must be between 0 and 100"}


def test_money_stays_exact_in_cents(api):
    d = api.deal(value_cents=1250050)
    assert api.get(f"/api/deals/{d['id']}")["value_cents"] == 1250050
    d2 = api.deal("Odd", value_cents=333, probability=50)
    # 333 cents at 50% is 166.5 cents, rounded half up
    assert d2["expected_cents"] == 167


def test_hand_set_probability_kept_without_stage_change(api):
    d = api.deal(stage="qualified", probability=40)
    d = api.put_deal(d, name="Renamed", value_cents=500_00)
    assert d["probability"] == 40
    d = api.put_deal(d, probability=55)
    assert d["probability"] == 55


def test_list_has_names_and_late_flag(api):
    org = api.org("Acme Ltd")
    c = api.contact("Maria Lopez")
    api.deal(organization_id=org["id"], contact_id=c["id"], close_date="2026-11-01")
    row = api.get("/api/deals")[0]
    assert row["organization_name"] == "Acme Ltd"
    assert row["contact_name"] == "Maria Lopez"
    assert row["late"] is True


def test_unknown_contact_gives_422(api, client):
    org = api.org()
    r = client.post(
        "/api/deals", json={"name": "X", "organization_id": org["id"], "contact_id": 999}
    )
    assert r.status_code == 422 and "contact_id" in r.json()["errors"]


def test_missing_deal_gives_404(client):
    assert client.get("/api/deals/5").status_code == 404
    assert client.post("/api/deals/5/move", json={"stage": "won", "index": 0}).status_code == 404
