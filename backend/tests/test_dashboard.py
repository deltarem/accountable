"""Dashboard figures on a small known data set; today is 23 Nov 2026, now 14:00."""

import pytest


@pytest.fixture
def data(api):
    org = api.org()["id"]
    a = api.deal("A", organization_id=org, value_cents=1_000_000)  # new, 10%
    b = api.deal("B", organization_id=org, value_cents=33_333, stage="proposal")  # 50%
    api.deal("W1", organization_id=org, value_cents=500_000, stage="won", close_date="2026-11-05")
    api.deal("W2", organization_id=org, value_cents=200_000, stage="won", close_date="2026-10-10")
    api.deal("W3", organization_id=org, value_cents=10_000, stage="won", close_date="2025-12-01")
    api.deal("W4", organization_id=org, value_cents=70_000, stage="won", close_date="2025-11-30")
    l1 = api.deal("L1", organization_id=org, value_cents=30_000, stage="proposal")
    api.put_deal(l1, stage="lost", close_date="2026-09-15")
    api.deal("L2", organization_id=org, value_cents=40_000, stage="lost", close_date="2026-06-01")
    api.deal("L3", organization_id=org, value_cents=90_000, stage="lost", close_date="2025-10-01")
    return {"org": org, "a": a, "b": b}


def test_headline_figures(api, data):
    d = api.get("/api/dashboard")
    assert d["open_pipeline_cents"] == 1_033_333
    assert d["open_deal_count"] == 2
    # 1_000_000 * 10% + 33_333 * 50% = 116_666.5 cents, rounded half up at the end
    assert d["expected_cents"] == 116_667
    assert d["won_this_month_cents"] == 500_000
    assert d["won_last_month_cents"] == 200_000
    assert d["won_change_pct"] == 150


def test_change_is_none_without_last_month(api):
    org = api.org()["id"]
    api.deal("W", organization_id=org, value_cents=100, stage="won", close_date="2026-11-02")
    assert api.get("/api/dashboard")["won_change_pct"] is None


def test_twelve_months_of_revenue_and_counts(api, data):
    d = api.get("/api/dashboard")
    months = d["months"]
    assert [m["month"] for m in months][0] == "2025-12"
    assert [m["month"] for m in months][-1] == "2026-11"
    assert len(months) == 12
    by = {m["month"]: m for m in months}
    assert by["2026-11"]["won_cents"] == 500_000 and by["2026-11"]["won_count"] == 1
    assert by["2026-10"]["won_cents"] == 200_000
    assert by["2025-12"]["won_cents"] == 10_000  # first day of the window counts
    assert by["2026-09"]["lost_count"] == 1 and by["2026-06"]["lost_count"] == 1
    assert d["won_total_cents"] == 710_000  # nothing from 13 months ago
    assert d["won_count"] == 3
    assert d["lost_count"] == 2


def test_funnel_from_stage_history(api, data):
    funnel = {f["stage"]: f for f in api.get("/api/dashboard")["funnel"]}
    assert [*funnel] == ["new", "qualified", "proposal", "negotiation", "won"]
    # L2 was created lost with no history, so it counts towards New only.
    assert funnel["new"]["value_cents"] == 1_813_333 and funnel["new"]["count"] == 7
    assert funnel["qualified"]["value_cents"] == 773_333 and funnel["qualified"]["count"] == 5
    assert funnel["proposal"]["value_cents"] == 773_333
    assert funnel["negotiation"]["value_cents"] == 710_000 and funnel["negotiation"]["count"] == 3
    assert funnel["won"]["value_cents"] == 710_000
    assert funnel["new"]["share_pct"] == 100
    assert funnel["won"]["share_pct"] == 39  # 710_000 / 1_813_333 = 39.2%


def test_pipeline_by_stage(api, data):
    rows = {r["stage"]: r for r in api.get("/api/dashboard")["pipeline_by_stage"]}
    assert [*rows] == ["new", "qualified", "proposal", "negotiation"]
    assert rows["new"] == {"stage": "new", "count": 1, "value_cents": 1_000_000, "expected_cents": 100_000}
    assert rows["proposal"]["expected_cents"] == 16_667
    assert rows["qualified"]["count"] == 0 and rows["qualified"]["value_cents"] == 0


def test_follow_up_counts_and_list(api):
    c = api.contact()["id"]
    org = api.org()["id"]
    d = api.deal("Deal", organization_id=org)["id"]
    api.activity("Overdue", contact_id=c, follow_up_date="2026-11-20")
    done = api.activity("Done overdue", contact_id=c, follow_up_date="2026-11-19")
    api.c.post(f"/api/activities/{done['id']}/done", json={"done": True})
    api.activity("Today", deal_id=d, follow_up_date="2026-11-23")
    api.activity("In a week", contact_id=c, follow_up_date="2026-11-30")
    api.activity("Later", contact_id=c, follow_up_date="2026-12-01")
    api.activity("No follow-up", contact_id=c)
    dash = api.get("/api/dashboard")
    assert dash["overdue_count"] == 1 and dash["due_today_count"] == 1
    listed = [(f["description"], f["group"]) for f in dash["follow_ups"]]
    assert listed == [("Overdue", "overdue"), ("Today", "today"), ("In a week", "week")]
    today = dash["follow_ups"][1]
    assert today["record"] == {"kind": "deal", "id": d, "name": "Deal", "organization_name": "Acme Ltd"}


def test_recent_activity_ten_newest_nothing_future(api):
    c = api.contact()["id"]
    for day in range(1, 13):
        api.activity(f"Day {day}", contact_id=c, occurred_at=f"2026-11-{day:02d}T09:00:00")
    api.activity("Future", contact_id=c, occurred_at="2026-11-23T15:00:00")
    api.activity("Just now", contact_id=c, occurred_at="2026-11-23T13:59:00")
    recent = api.get("/api/dashboard")["recent_activity"]
    assert len(recent) == 10
    assert recent[0]["description"] == "Just now"
    assert [r["description"] for r in recent[1:]] == [f"Day {d}" for d in range(12, 3, -1)]
    assert recent[0]["record"]["kind"] == "contact"


def test_empty_database(api):
    d = api.get("/api/dashboard")
    assert d["open_pipeline_cents"] == 0 and d["expected_cents"] == 0
    assert d["funnel"][0]["share_pct"] is None
    assert d["follow_ups"] == [] and d["recent_activity"] == []
    assert len(d["months"]) == 12
