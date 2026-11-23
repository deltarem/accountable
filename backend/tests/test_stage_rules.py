import pytest


def events_of(api, deal_id):
    return [e for e in api.get(f"/api/deals/{deal_id}")["timeline"] if e["kind"] == "stage_change"]


def status_events(api, contact_id):
    return [e for e in api.get(f"/api/contacts/{contact_id}")["timeline"] if e["kind"] == "status_change"]


@pytest.fixture(params=["put", "move"])
def change(request, api):
    """The same rules apply through PUT and through move (ARC-02)."""

    def _change(deal, stage):
        if request.param == "put":
            return api.put_deal(deal, stage=stage)
        return api.move(deal["id"], stage)

    return _change


def test_every_stage_change_writes_one_event(api, change):
    d = api.deal()
    d = change(d, "qualified")
    d = change(d, "proposal")
    evs = events_of(api, d["id"])
    assert [(e["from_value"], e["to_value"]) for e in evs] == [("qualified", "proposal"), ("new", "qualified")]


def test_no_event_without_a_change(api, change):
    d = api.deal()
    change(d, "new")
    assert events_of(api, d["id"]) == []


def test_probability_resets_to_new_stage(api, change):
    d = api.deal(probability=33)
    d = change(d, "negotiation")
    assert d["probability"] == 75


def test_put_with_chosen_probability_keeps_it(api):
    d = api.deal()
    d = api.put_deal(d, stage="proposal", probability=60)
    assert d["probability"] == 60


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_closing_sets_close_date_to_today(api, change, stage):
    d = api.deal(close_date="2027-02-01")
    d = change(d, stage)
    assert d["close_date"] == "2026-11-23"
    assert d["probability"] == (100 if stage == "won" else 0)


def test_form_can_choose_another_close_date_when_winning(api):
    d = api.deal(close_date="2027-02-01")
    d = api.put_deal(d, stage="won", close_date="2026-11-16")
    assert d["close_date"] == "2026-11-16"


def test_reopening_keeps_the_date_and_is_late(api, change):
    d = api.deal()
    d = change(d, "won")
    api.put_deal(d, close_date="2026-11-10")
    d = api.get(f"/api/deals/{d['id']}")
    d = change(d, "negotiation")
    assert d["close_date"] == "2026-11-10"
    assert d["late"] is True


def test_winning_makes_main_contact_a_customer(api, change):
    c = api.contact(status="qualified")
    d = api.deal(contact_id=c["id"])
    change(d, "won")
    assert api.get(f"/api/contacts/{c['id']}")["status"] == "customer"
    evs = status_events(api, c["id"])
    assert [(e["from_value"], e["to_value"]) for e in evs] == [("qualified", "customer")]


def test_winning_with_no_main_contact_changes_nobody(api, change):
    c = api.contact()
    d = api.deal()
    change(d, "won")
    assert api.get(f"/api/contacts/{c['id']}")["status"] == "lead"


def test_winning_when_already_customer_writes_no_event(api, change):
    c = api.contact(status="customer")
    d = api.deal(contact_id=c["id"])
    change(d, "won")
    assert status_events(api, c["id"]) == []


def test_reopening_a_won_deal_keeps_the_customer(api, change):
    c = api.contact()
    d = api.deal(contact_id=c["id"])
    d = change(d, "won")
    change(d, "proposal")
    assert api.get(f"/api/contacts/{c['id']}")["status"] == "customer"
