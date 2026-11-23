"""The sample data (SEED-01 to SEED-06, RUN-03, ARC-13)."""

import subprocess
import sys
import threading
from collections import Counter
from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from backend import db
from backend.db import activities, contacts, deals, events, organizations
from backend.seed import seed_database
from backend.services.stages import OPEN_STAGES, ORDER, STAGES

TODAY = date(2026, 11, 23)


@pytest.fixture
def seeded():
    seed_database()


def rows(table):
    with db.reading() as conn:
        return [dict(r) for r in conn.execute(select(table).order_by(table.c.id)).mappings()]


def test_counts_and_stage_split(seeded):
    assert len(rows(organizations)) == 10
    assert len({o["industry"] for o in rows(organizations)}) >= 6
    all_contacts = rows(contacts)
    assert len(all_contacts) == 25
    assert Counter(c["status"] for c in all_contacts) == {"lead": 9, "qualified": 7, "customer": 9}
    assert sum(1 for c in all_contacts if c["organization_id"] is None) == 3
    stages = Counter(d["stage"] for d in rows(deals))
    assert stages == {"new": 4, "qualified": 4, "proposal": 3, "negotiation": 3, "won": 13, "lost": 3}
    values = [d["value_cents"] for d in rows(deals)]
    assert min(values) == 2_500_00 and max(values) == 180_000_00
    assert 55 <= len(rows(activities)) <= 70


def test_a_win_every_month_and_three_late(seeded):
    won = [d for d in rows(deals) if d["stage"] == "won"]
    months = {(d["close_date"].year, d["close_date"].month) for d in won}
    expected = set()
    for i in range(12):
        idx = TODAY.year * 12 + TODAY.month - 1 - i
        expected.add((idx // 12, idx % 12 + 1))
    assert expected <= months
    open_deals = [d for d in rows(deals) if STAGES[d["stage"]].open]
    late = [d for d in open_deals if d["close_date"] < TODAY]
    assert len(late) == 3
    assert all(d["close_date"] <= TODAY + timedelta(days=4 * 31) for d in open_deals)


def test_every_customer_has_a_won_deal(seeded):
    won_contacts = {d["contact_id"] for d in rows(deals) if d["stage"] == "won"}
    for c in rows(contacts):
        if c["status"] == "customer":
            assert c["id"] in won_contacts, c["name"]
        if c["id"] in won_contacts:
            assert c["status"] == "customer", c["name"]


def test_events_end_at_current_stage_and_positions_are_set(seeded):
    evs = rows(events)
    for d in rows(deals):
        own = sorted((e for e in evs if e["deal_id"] == d["id"]), key=lambda e: (e["occurred_at"], e["id"]))
        if d["stage"] == "new":
            assert own == []
            continue
        assert own, d["name"]
        assert own[0]["from_value"] == "new"
        assert own[-1]["to_value"] == d["stage"]
        for a, b in zip(own, own[1:]):
            assert a["to_value"] == b["from_value"]
    for stage in ORDER:
        pos = sorted(d["position"] for d in rows(deals) if d["stage"] == stage)
        assert pos == list(range(len(pos)))


def test_follow_up_mix(seeded):
    acts = [a for a in rows(activities) if a["follow_up_date"] is not None]
    pending = [a for a in acts if not a["follow_up_done"]]
    overdue = [a for a in pending if a["follow_up_date"] < TODAY]
    today = [a for a in pending if a["follow_up_date"] == TODAY]
    week = [a for a in pending if TODAY < a["follow_up_date"] <= TODAY + timedelta(days=7)]
    later = [a for a in pending if a["follow_up_date"] > TODAY + timedelta(days=7)]
    assert (len(overdue), len(today), len(week), len(later)) == (4, 2, 4, 3)
    assert sum(1 for a in acts if a["follow_up_done"]) >= 3


def test_two_hand_set_probabilities(seeded):
    differ = [d for d in rows(deals) if STAGES[d["stage"]].open and d["probability"] != STAGES[d["stage"]].probability]
    assert len(differ) == 2


def test_figures_match_the_mockup(seeded, client):
    d = client.get("/api/dashboard").json()
    assert d["open_pipeline_cents"] == 1_130_000_00
    assert d["open_deal_count"] == 14
    assert d["won_total_cents"] == 668_000_00
    assert d["overdue_count"] == 4
    assert [f["value_cents"] for f in d["funnel"]] == [1_948_000_00, 1_828_000_00, 1_483_000_00, 1_083_000_00, 668_000_00]


def test_seeding_twice_gives_the_same_data(seeded):
    first = {t.name: rows(t) for t in db.ALL_TABLES}
    seed_database()
    assert {t.name: rows(t) for t in db.ALL_TABLES} == first


def test_empty_leaves_every_table_empty(seeded):
    seed_database(empty=True)
    for t in db.ALL_TABLES:
        assert rows(t) == [], t.name


def test_command_line_resets(fresh_db):
    seed_database()
    with db.transaction() as conn:
        conn.execute(organizations.delete().where(organizations.c.id == 1))
    db.dispose_engines()
    subprocess.run([sys.executable, "-m", "backend.seed"], check=True, capture_output=True)
    assert len(rows(organizations)) == 10
    subprocess.run([sys.executable, "-m", "backend.seed", "--empty"], check=True, capture_output=True)
    assert rows(organizations) == []


def test_seeding_while_another_connection_reads(seeded):
    errors = []
    stop = threading.Event()

    def reader():
        try:
            while not stop.is_set():
                with db.reading() as conn:
                    conn.execute(select(func.count()).select_from(deals)).scalar_one()
        except Exception as exc:  # pragma: no cover - reported below
            errors.append(exc)

    thread = threading.Thread(target=reader)
    thread.start()
    try:
        for _ in range(3):
            seed_database()
    finally:
        stop.set()
        thread.join()
    assert errors == []
    assert len(rows(deals)) == 30
