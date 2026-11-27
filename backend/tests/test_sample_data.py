from collections import Counter
from datetime import date, datetime, timedelta
from itertools import pairwise

import pytest
from accountable import db
from accountable.crm import rules, sample_data
from accountable.crm.tables import activities, contacts, deals, name_key, organizations, products, stage_changes
from accountable.users import users
from conftest import copy_of_migrated, prebuilt, using_database
from sqlalchemy import select

DAYS = [date(2027, 1, 1), date(2027, 3, 1), date(2028, 2, 29), date(2027, 1, 31), date(2026, 10, 31), date(2026, 7, 14)]
SAME_DAY = date(2026, 10, 31)
TABLES = {
    "organizations": organizations,
    "contacts": contacts,
    "deals": deals,
    "activities": activities,
    "stage_changes": stage_changes,
    "products": products,
    "users": users,
}


def rows_of(conn, table):
    return conn.execute(select(table)).all()


def seeding_on(day: date):
    def make(path) -> None:
        copy_of_migrated(path)
        with using_database(path), db.writing() as conn:
            sample_data.fill(conn, day)

    return make


# Seeding takes about a second, so each day is seeded once, before the tests, and the tests only read it.
for day in DAYS:
    prebuilt.register(f"sample-{day}", seeding_on(day), used_by="seeded")
prebuilt.register(f"sample-{SAME_DAY}-again", seeding_on(SAME_DAY), used_by="seeded_twice")


def rows_in(name: str) -> dict:
    with using_database(prebuilt.path(name)), db.reading() as conn:
        return {kind: rows_of(conn, table) for kind, table in TABLES.items()}


@pytest.fixture(scope="module")
def rows_by_day() -> dict:
    return {}


@pytest.fixture(params=DAYS, ids=str)
def seeded(request, rows_by_day):
    """The rows for one seeding day."""
    today = request.param
    if today not in rows_by_day:
        rows_by_day[today] = {"today": today, **rows_in(f"sample-{today}")}
    return rows_by_day[today]


@pytest.fixture
def seeded_twice() -> tuple[dict, dict]:
    """The same day seeded twice, in two databases."""
    return rows_in(f"sample-{SAME_DAY}"), rows_in(f"sample-{SAME_DAY}-again")


def months_back(today: date, count: int) -> list[tuple[int, int]]:
    index = today.year * 12 + today.month - 1
    return [((index - back) // 12, (index - back) % 12 + 1) for back in range(count)]


def test_activity_types_are_spread_through_the_working_day(seeded):
    for kind in ("call", "email", "note"):
        hours = {row.occurred_at.hour for row in seeded["activities"] if row.type == kind}
        assert len(hours) >= 6


def test_the_amounts(seeded):
    assert len(seeded["organizations"]) == 24
    assert len(seeded["contacts"]) == 75
    assert len(seeded["deals"]) == 80
    assert len(seeded["activities"]) == 300


def test_at_least_six_industries(seeded):
    assert len({row.industry for row in seeded["organizations"]}) >= 6


def test_every_status(seeded):
    assert {row.status for row in seeded["contacts"]} == {"lead", "qualified", "customer"}


def test_every_won_deals_main_contact_is_a_customer(seeded):
    status = {row.id: row.status for row in seeded["contacts"]}
    for deal in seeded["deals"]:
        if deal.stage == "won":
            assert status[deal.main_contact_id] == "customer"


def test_open_deals(seeded):
    today = seeded["today"]
    open_deals = [row for row in seeded["deals"] if row.stage in rules.OPEN_STAGES]
    assert len(open_deals) == 36
    assert {row.stage for row in open_deals} == set(rules.OPEN_STAGES)
    assert sum(rules.is_late(row.stage, row.close_date, today) for row in open_deals) >= 5

    index = today.year * 12 + today.month - 1
    coming = {(row.close_date.year, row.close_date.month) for row in open_deals}
    for ahead in (1, 2, 3):
        assert ((index + ahead) // 12, (index + ahead) % 12 + 1) in coming


def test_closed_deals(seeded):
    stages = Counter(row.stage for row in seeded["deals"])
    assert stages["won"] == 32
    assert stages["lost"] == 12


def test_a_win_in_every_month_with_none_in_the_future(seeded):
    today = seeded["today"]
    won = [row for row in seeded["deals"] if row.stage == "won"]
    assert all(row.close_date <= today for row in won)
    months = Counter((row.close_date.year, row.close_date.month) for row in won)
    assert all(months[month] >= 1 for month in months_back(today, 12))
    assert set(months) <= set(months_back(today, 12))


def test_lost_deals_are_never_in_the_future(seeded):
    assert all(row.close_date <= seeded["today"] for row in seeded["deals"] if row.stage == "lost")


def test_at_least_two_wins_this_month(seeded):
    today = seeded["today"]
    this_month = [
        row
        for row in seeded["deals"]
        if row.stage == "won" and (row.close_date.year, row.close_date.month) == (today.year, today.month)
    ]
    assert len(this_month) >= 2


def test_revenue_trends_upward(seeded):
    today = seeded["today"]
    revenue = Counter()
    for row in seeded["deals"]:
        if row.stage == "won":
            revenue[(row.close_date.year, row.close_date.month)] += row.value
    series = [revenue[month] for month in reversed(months_back(today, 12))]
    assert sum(series[6:]) > sum(series[:6])


def test_activities(seeded):
    today = seeded["today"]
    rows = seeded["activities"]
    assert {row.type for row in rows} == {"note", "call", "email"}
    waiting = [row for row in rows if row.follow_up_date and not row.follow_up_done]
    assert sum(row.follow_up_date < today for row in waiting) >= 6
    assert sum(row.follow_up_date >= today for row in waiting) >= 10


def test_nothing_logged_is_in_the_future(seeded):
    limit = datetime.combine(seeded["today"] + timedelta(days=1), datetime.min.time()) + timedelta(hours=14)
    assert all(row.occurred_at < limit for row in seeded["activities"])


def test_dates_follow_the_seeding_day(seeded_twice):
    first, _again = seeded_twice
    later = rows_in(f"sample-{date(2027, 3, 1)}")
    assert max(row.close_date for row in later["deals"]) > max(row.close_date for row in first["deals"])


def test_every_deal_has_a_full_stage_history(seeded):
    changes: dict[int, list] = {}
    for row in sorted(seeded["stage_changes"], key=lambda change: change.id):
        changes.setdefault(row.deal_id, []).append(row)

    for deal in seeded["deals"]:
        steps = changes.get(deal.id, [])
        if deal.stage == "new":
            assert steps == []
            continue
        assert steps, deal.name
        assert steps[0].from_stage == "new"
        assert steps[-1].to_stage == deal.stage
        for before, after in pairwise(steps):
            assert before.to_stage == after.from_stage
            assert before.changed_at < after.changed_at


def test_only_example_addresses(seeded):
    for row in seeded["contacts"]:
        assert row.email.endswith(".example")
    for row in seeded["organizations"]:
        assert row.website.endswith(".example")


def test_the_same_content_each_time(seeded_twice):
    def snapshot(rows):
        return (
            [(row.name, row.stage, row.value, row.close_date) for row in rows["deals"]],
            [(row.name, row.email) for row in rows["contacts"]],
            [(row.type, row.description) for row in rows["activities"]],
        )

    first, again = seeded_twice
    assert snapshot(first)[0]
    assert snapshot(again) == snapshot(first)


def test_won_and_lost_columns_start_newest_first(seeded):
    for stage in ("won", "lost"):
        column = sorted((row for row in seeded["deals"] if row.stage == stage), key=lambda row: row.position)
        dates = [row.close_date for row in column]
        assert dates == sorted(dates, reverse=True)


TEAMMATE_IDS = {teammate.id for teammate in sample_data.TEAMMATES}
RECORDS = ("organizations", "contacts", "deals", "activities", "products")


def test_the_four_made_up_teammates_with_robin_having_no_name(seeded):
    assert {(row.name, row.email) for row in seeded["users"]} == {
        ("Alex Rivera", "alex.rivera@accountable.example"),
        ("Dana Whitfield", "dana.whitfield@accountable.example"),
        ("Theo Brandt", "theo.brandt@accountable.example"),
        (None, "robin@accountable.example"),
    }
    assert {row.id for row in seeded["users"]} == TEAMMATE_IDS


def test_no_teammate_shares_a_name_with_a_sample_contact(seeded):
    contact_words = {word for row in seeded["contacts"] for word in row.name.split()}
    for teammate in sample_data.TEAMMATES:
        assert not set((teammate.name or "").split()) & contact_words, teammate.name


def test_every_record_and_stage_change_is_put_down_to_a_teammate(seeded):
    for kind in RECORDS:
        for row in seeded[kind]:
            assert row.created_by in TEAMMATE_IDS, kind
            assert row.updated_by in TEAMMATE_IDS, kind
    assert {row.created_by for row in seeded["stage_changes"]} == TEAMMATE_IDS


def test_each_teammate_added_some_of_each_kind(seeded):
    for kind in RECORDS:
        assert {row.created_by for row in seeded[kind]} == TEAMMATE_IDS, kind


@pytest.mark.parametrize("kind", ["organizations", "contacts", "deals", "products"])
def test_some_records_were_last_changed_by_another_teammate_since(seeded, kind):
    changed = [row for row in seeded[kind] if row.updated_by != row.created_by]
    assert len(changed) >= 5
    assert all(row.updated_at > row.created_at for row in changed)


@pytest.mark.parametrize("kind", RECORDS)
def test_nothing_was_changed_before_it_was_added_or_after_today(seeded, kind):
    limit = datetime.combine(seeded["today"] + timedelta(days=1), datetime.min.time()) + timedelta(hours=14)
    for row in seeded[kind]:
        assert row.created_at <= row.updated_at < limit


@pytest.mark.parametrize("kind", ["organizations", "contacts", "deals", "products"])
def test_records_nobody_changed_have_one_moment_for_both_times(seeded, kind):
    unchanged = [row for row in seeded[kind] if row.updated_at == row.created_at]
    assert unchanged
    assert all(row.updated_by == row.created_by for row in unchanged)


def test_twelve_products_each_with_a_name_of_its_own(seeded):
    names = [row.name for row in seeded["products"]]
    assert len(names) == 12
    assert len({name_key(name) for name in names}) == 12
    assert all(row.name_key == name_key(row.name) for row in seeded["products"])


def test_product_prices_are_realistic_and_some_have_cents(seeded):
    prices = [row.unit_price_cents for row in seeded["products"]]
    assert all(100_00 <= price <= 10_000_00 for price in prices)
    assert sum(price % 100 != 0 for price in prices) >= 3


def test_two_products_are_archived_each_by_a_teammate_other_than_who_added_it(seeded):
    archived = [row for row in seeded["products"] if not row.active]
    assert len(archived) == 2
    assert all(row.updated_by != row.created_by and row.updated_at > row.created_at for row in archived)


def test_a_product_without_a_description_shows_none(seeded):
    assert [row.name for row in seeded["products"] if row.description is None] == ["Custom report"]
