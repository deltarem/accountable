"""The price list through the API: adding, editing, archiving and restoring, prices and unique names (G4 to G9)."""

from datetime import timedelta

import pytest
from accountable import db
from accountable.crm.routers import products as products_router
from accountable.crm.sample_data import TEAMMATES
from accountable.crm.tables import name_key, products
from conftest import NOW, insert_row
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

PRODUCTS = "/api/products"
ALEX, DANA, _THEO, ROBIN = TEAMMATES
LATER = NOW + timedelta(hours=2)
NOW_TEXT = "2026-10-31T15:00:00Z"
LATER_TEXT = "2026-10-31T17:00:00Z"


def named(teammate) -> dict:
    return {"id": teammate.id, "name": teammate.name or teammate.email}


def add(api, name: str = "Training day", unit_price_cents: int = 145000, **values) -> dict:
    reply = api.post(PRODUCTS, json={"name": name, "unit_price_cents": unit_price_cents, **values})
    assert reply.status_code == 201, reply.text
    return reply.json()


def refused(reply, field: str) -> str:
    assert reply.status_code == 422, reply.text
    return reply.json()["fields"][field]


@pytest.fixture
def as_dana(api, sign_in_as):
    """Makes the next requests as Dana, two hours after the api's own, which are Alex's."""

    def switch():
        api.app.dependency_overrides[db.utc_now] = lambda: LATER
        return sign_in_as(DANA.id)

    return switch


def test_adding_a_product_gives_it_back_active_with_who_added_it(api):
    product = add(api, "Training day", 145000, description="A full day on site.\nUp to 12 people.")
    assert product == {
        "id": product["id"],
        "name": "Training day",
        "description": "A full day on site.\nUp to 12 people.",
        "unit_price_cents": 145000,
        "active": True,
        "created_at": NOW_TEXT,
        "created_by": named(ALEX),
        "updated_at": NOW_TEXT,
        "updated_by": named(ALEX),
    }
    assert api.get(f"{PRODUCTS}/{product['id']}").json() == product


def test_a_description_is_optional_and_blank_is_none(api):
    assert add(api, "Setup")["description"] is None
    assert add(api, "Custom report", description="   ")["description"] is None


def test_the_list_has_every_product_archived_ones_included_by_name(api):
    training = add(api, "training day")
    setup = add(api, "Setup and data import", 250000)
    api.patch(f"{PRODUCTS}/{setup['id']}", json={"active": False})
    assert api.get(PRODUCTS).json() == [
        {
            "id": setup["id"],
            "name": "Setup and data import",
            "description": None,
            "unit_price_cents": 250000,
            "active": False,
        },
        {"id": training["id"], "name": "training day", "description": None, "unit_price_cents": 145000, "active": True},
    ]


def test_an_edit_changes_the_fields_sent_and_records_who(api, as_dana):
    product = add(api, description="Old words")
    reply = as_dana().patch(
        f"{PRODUCTS}/{product['id']}", json={"name": "Training day, full", "unit_price_cents": 150000}
    )
    assert reply.status_code == 200
    edited = reply.json()
    assert (edited["name"], edited["unit_price_cents"], edited["description"]) == (
        "Training day, full",
        150000,
        "Old words",
    )
    assert (edited["created_by"], edited["created_at"]) == (named(ALEX), NOW_TEXT)
    assert (edited["updated_by"], edited["updated_at"]) == (named(DANA), LATER_TEXT)


def test_a_description_can_be_cleared(api):
    product = add(api, description="Old words")
    assert api.patch(f"{PRODUCTS}/{product['id']}", json={"description": None}).json()["description"] is None


def test_a_save_that_alters_nothing_isnt_a_change(api, as_dana):
    product = add(api, description="Words")
    same = {"name": "Training day", "description": "Words", "unit_price_cents": 145000, "active": True}
    edited = as_dana().patch(f"{PRODUCTS}/{product['id']}", json=same).json()
    assert (edited["updated_by"], edited["updated_at"]) == (named(ALEX), NOW_TEXT)


def test_archiving_and_restoring_are_each_a_change_by_whoever_made_it(api, as_dana, sign_in_as):
    product = add(api)
    archived = as_dana().patch(f"{PRODUCTS}/{product['id']}", json={"active": False}).json()
    assert archived["active"] is False
    assert (archived["name"], archived["unit_price_cents"]) == ("Training day", 145000)
    assert (archived["updated_by"], archived["updated_at"]) == (named(DANA), LATER_TEXT)

    restored = sign_in_as(ROBIN.id).patch(f"{PRODUCTS}/{product['id']}", json={"active": True}).json()
    assert restored["active"] is True
    assert restored["updated_by"] == named(ROBIN)
    assert restored["created_by"] == named(ALEX)


def test_an_archived_product_can_still_be_edited(api):
    product = add(api)
    api.patch(f"{PRODUCTS}/{product['id']}", json={"active": False})
    edited = api.patch(f"{PRODUCTS}/{product['id']}", json={"unit_price_cents": 99}).json()
    assert (edited["unit_price_cents"], edited["active"]) == (99, False)


NAMING_SOMEONE = {
    "created_by": ROBIN.id,
    "updated_by": ROBIN.id,
    "created_at": "2020-01-01T00:00:00Z",
    "updated_at": "2020-01-01T00:00:00Z",
    "name_key": "something else",
}


def test_a_body_naming_someone_or_a_key_changes_nothing(api, as_dana):
    product = api.post(PRODUCTS, json={"name": "Training day", "unit_price_cents": 145000, **NAMING_SOMEONE}).json()
    assert (product["created_by"], product["created_at"]) == (named(ALEX), NOW_TEXT)
    edited = as_dana().patch(f"{PRODUCTS}/{product['id']}", json=NAMING_SOMEONE).json()
    assert (edited["updated_by"], edited["updated_at"]) == (named(ALEX), NOW_TEXT)
    with db.reading() as conn:
        assert conn.scalar(select(products.c.name_key)) == "training day"


@pytest.mark.parametrize("cents", [0, 4950, 100_000_000])
def test_prices_from_nothing_to_a_million_dollars_are_kept_in_cents(api, cents):
    assert add(api, unit_price_cents=cents)["unit_price_cents"] == cents


@pytest.mark.parametrize("cents", [-1, 100_000_001, 49.5, 4950.0, "4950", None, True])
def test_a_price_that_isnt_whole_cents_in_range_is_refused(api, cents):
    reply = api.post(PRODUCTS, json={"name": "Training day", "unit_price_cents": cents})
    assert refused(reply, "unit_price_cents")
    assert api.get(PRODUCTS).json() == []


def test_a_missing_price_is_refused(api):
    assert refused(api.post(PRODUCTS, json={"name": "Training day"}), "unit_price_cents")


@pytest.mark.parametrize("cents", [-1, 100_000_001, 49.5, "4950"])
def test_an_edit_with_a_bad_price_is_refused_and_changes_nothing(api, cents):
    product = add(api)
    assert refused(api.patch(f"{PRODUCTS}/{product['id']}", json={"unit_price_cents": cents}), "unit_price_cents")
    assert api.get(f"{PRODUCTS}/{product['id']}").json()["unit_price_cents"] == 145000


@pytest.mark.parametrize("active", ["true", "false", 1, 0, None])
def test_active_has_to_be_true_or_false(api, active):
    product = add(api)
    assert refused(api.patch(f"{PRODUCTS}/{product['id']}", json={"active": active}), "active")
    assert api.get(f"{PRODUCTS}/{product['id']}").json()["active"] is True


@pytest.mark.parametrize("name", ["", "   ", None])
def test_a_blank_name_is_refused(api, name):
    reply = api.post(PRODUCTS, json={"name": name, "unit_price_cents": 100})
    assert refused(reply, "name") == "Enter a name"


def test_spaces_at_either_end_of_a_name_are_dropped(api):
    product = add(api, "  Training day  ")
    assert product["name"] == "Training day"
    edited = api.patch(f"{PRODUCTS}/{product['id']}", json={"name": "  Setup  "}).json()
    assert edited["name"] == "Setup"


ACTIVE_CLASH = "There's already a product called Training day."
ARCHIVED_CLASH = "An archived product is already called Training day. Restore it or choose another name."


@pytest.mark.parametrize("name", ["Training day", "TRAINING DAY", "training Day", "  Training day  "])
def test_a_name_another_product_has_in_any_case_is_refused(api, name):
    add(api, "Training day")
    assert refused(api.post(PRODUCTS, json={"name": name, "unit_price_cents": 1}), "name") == ACTIVE_CLASH
    assert len(api.get(PRODUCTS).json()) == 1


def test_names_are_compared_in_every_language(api):
    add(api, "Straße")
    reply = api.post(PRODUCTS, json={"name": "STRASSE", "unit_price_cents": 1})
    assert refused(reply, "name") == "There's already a product called Straße."


def test_an_archived_products_name_is_still_taken(api):
    product = add(api, "Training day")
    api.patch(f"{PRODUCTS}/{product['id']}", json={"active": False})
    assert refused(api.post(PRODUCTS, json={"name": "training day", "unit_price_cents": 1}), "name") == ARCHIVED_CLASH


def test_an_edit_to_another_products_name_is_refused_and_changes_nothing(api):
    add(api, "Training day")
    setup = add(api, "Setup")
    reply = api.patch(f"{PRODUCTS}/{setup['id']}", json={"name": "TRAINING DAY", "unit_price_cents": 5})
    assert refused(reply, "name") == ACTIVE_CLASH
    assert api.get(f"{PRODUCTS}/{setup['id']}").json()["unit_price_cents"] == 145000


def test_a_product_can_keep_its_own_name_or_change_only_its_case(api):
    product = add(api, "training day")
    assert api.patch(f"{PRODUCTS}/{product['id']}", json={"name": "training day"}).status_code == 200
    reply = api.patch(f"{PRODUCTS}/{product['id']}", json={"name": "Training Day"})
    assert reply.status_code == 200
    assert reply.json()["name"] == "Training Day"


def test_the_name_key_is_the_trimmed_name_in_every_languages_case():
    assert name_key("  Straße ") == name_key("STRASSE") == "strasse"


def test_the_database_refuses_a_second_copy_of_a_name(api):
    add(api, "Training day")
    with pytest.raises(IntegrityError), db.writing() as conn:
        insert_row(conn, products, name="TRAINING DAY", name_key="training day", unit_price_cents=1)


@pytest.mark.parametrize(("archived", "message"), [(False, ACTIVE_CLASH), (True, ARCHIVED_CLASH)])
def test_a_clash_the_routes_check_misses_gets_the_same_reply(api, monkeypatch, archived, message):
    """Two saves at once can't both get past the check, since writes take turns, but a write from outside the app can."""
    product = add(api, "Training day")
    api.patch(f"{PRODUCTS}/{product['id']}", json={"active": not archived})
    setup = add(api, "Setup")
    monkeypatch.setattr(products_router, "_refuse_a_taken_name", lambda *_args, **_kwargs: None)

    assert refused(api.post(PRODUCTS, json={"name": "training day", "unit_price_cents": 1}), "name") == message
    assert refused(api.patch(f"{PRODUCTS}/{setup['id']}", json={"name": "TRAINING DAY"}), "name") == message
    assert [row["name"] for row in api.get(PRODUCTS).json()] == ["Setup", "Training day"]


def test_products_cant_be_deleted(api):
    product = add(api)
    assert api.delete(f"{PRODUCTS}/{product['id']}").status_code == 405
    assert api.get(f"{PRODUCTS}/{product['id']}").status_code == 200


def test_a_missing_product_is_not_found(api):
    assert api.get(f"{PRODUCTS}/999").status_code == 404
    assert api.patch(f"{PRODUCTS}/999", json={"active": False}).status_code == 404
