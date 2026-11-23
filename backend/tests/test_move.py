def column(api, stage):
    return [d["name"] for d in api.get("/api/deals") if d["stage"] == stage]


def positions(api, stage):
    return [d["position"] for d in api.get("/api/deals") if d["stage"] == stage]


def setup_column(api, stage="new", names=("A", "B", "C", "D")):
    org = api.org()
    made = {}
    # New deals go to the top, so create in reverse to get A, B, C, D.
    for n in reversed(names):
        made[n] = api.deal(n, organization_id=org["id"], stage=stage)
    assert column(api, stage) == list(names)
    return org, made


def test_move_within_column_to_top_and_bottom(api):
    _, m = setup_column(api)
    api.move(m["C"]["id"], "new", 0)
    assert column(api, "new") == ["C", "A", "B", "D"]
    api.move(m["C"]["id"], "new", 3)
    assert column(api, "new") == ["A", "B", "D", "C"]
    api.move(m["A"]["id"], "new", 2)
    assert column(api, "new") == ["B", "D", "A", "C"]


def test_move_to_another_column_at_index(api):
    org, m = setup_column(api)
    api.deal("X", organization_id=org["id"], stage="proposal")
    api.deal("Y", organization_id=org["id"], stage="proposal")
    api.move(m["B"]["id"], "proposal", 1)
    assert column(api, "proposal") == ["Y", "B", "X"]
    assert column(api, "new") == ["A", "C", "D"]
    assert positions(api, "proposal") == [0, 1, 2]
    assert positions(api, "new") == [0, 1, 2]


def test_move_to_empty_column(api):
    _, m = setup_column(api)
    d = api.move(m["D"]["id"], "negotiation", 0)
    assert d["stage"] == "negotiation" and d["position"] == 0
    assert column(api, "negotiation") == ["D"]
    assert positions(api, "new") == [0, 1, 2]


def test_index_past_the_end_lands_last(api):
    _, m = setup_column(api)
    api.move(m["A"]["id"], "new", 99)
    assert column(api, "new") == ["B", "C", "D", "A"]
    assert positions(api, "new") == [0, 1, 2, 3]


def test_bad_move_body_gives_422(api, client):
    _, m = setup_column(api)
    r = client.post(f"/api/deals/{m['A']['id']}/move", json={"stage": "nowhere", "index": 0})
    assert r.status_code == 422 and r.json()["errors"] == {"stage": "Choose a stage"}


def test_missing_deal_gives_404(client):
    assert client.post("/api/deals/123/move", json={"stage": "new", "index": 0}).status_code == 404
