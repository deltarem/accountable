"""The company settings: their rules, tidying, who changed them, and one set for everyone (B1 to B8)."""

import json
from datetime import timedelta
from pathlib import Path

import pytest
from accountable import company, db
from accountable.crm.sample_data import TEAMMATES
from conftest import NOW
from sqlalchemy import delete, select

SETTINGS = "/api/settings"
CASES = json.loads((Path(__file__).resolve().parents[2] / "shared" / "company-settings-cases.json").read_text())
MESSAGES = CASES["messages"]
ALEX, DANA, *_others = TEAMMATES
LATER = NOW + timedelta(hours=2)


def cases(kind: str) -> list[tuple[str, dict]]:
    return [(field, case) for field, both in CASES["fields"].items() for case in both[kind]]


def sent(case: dict):
    return case["sent"] if "sent" in case else case["typed"]


def stored():
    with db.reading() as conn:
        return conn.execute(select(company.company_settings)).one()


def as_dana(api, sign_in_as):
    """Makes the next requests come from Dana, two hours after Alex's."""
    api.app.dependency_overrides[db.utc_now] = lambda: LATER
    return sign_in_as(DANA.id)


# The rules (B3, B5)


@pytest.mark.parametrize(("field", "case"), cases("accepted"))
def test_a_good_value_is_saved_tidied(api, field, case):
    reply = api.patch(SETTINGS, json={field: sent(case)})
    assert reply.status_code == 200, reply.text
    assert reply.json()[field] == case["saved"]
    if "stored" in case:
        assert getattr(stored(), field) == case["stored"]


@pytest.mark.parametrize(("field", "case"), cases("refused"))
def test_a_bad_value_is_refused_beside_its_field_and_nothing_changes(api, field, case):
    before = stored()
    reply = api.patch(SETTINGS, json={field: sent(case)})
    assert reply.status_code == 422
    assert reply.json()["fields"] == {field: MESSAGES[field]}
    assert stored() == before


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("company_name", None),
        ("company_name", 12),
        ("tax_rate", 8.875),
        ("tax_rate", None),
        ("payment_terms_days", "30"),
        ("payment_terms_days", True),
        ("payment_terms_days", None),
        ("quote_prefix", None),
        ("invoice_prefix", ["INV-"]),
        ("email", 12),
    ],
)
def test_a_wrong_type_or_a_null_gets_the_fields_own_message(api, field, value):
    reply = api.patch(SETTINGS, json={field: value})
    assert reply.status_code == 422
    assert reply.json()["fields"] == {field: MESSAGES[field]}


def test_several_bad_values_each_get_their_message(api):
    reply = api.patch(SETTINGS, json={"tax_rate": "150", "payment_terms_days": 400, "company_name": " "})
    assert reply.json()["fields"] == {
        "tax_rate": MESSAGES["tax_rate"],
        "payment_terms_days": MESSAGES["payment_terms_days"],
        "company_name": MESSAGES["company_name"],
    }


# Tidying (B4)


def test_the_address_keeps_its_line_breaks_and_loses_its_blank_ends(api):
    reply = api.patch(SETTINGS, json={"address": "\n  48 Larkspur Avenue\nBrooklyn, NY 11201  \n\n"})
    assert reply.json()["address"] == "48 Larkspur Avenue\nBrooklyn, NY 11201"


@pytest.mark.parametrize("field", ["address", "email", "phone", "tax_label"])
def test_a_blank_optional_field_is_saved_as_blank(api, field):
    api.patch(SETTINGS, json={field: "something@example.com"})
    reply = api.patch(SETTINGS, json={field: "   "})
    assert reply.json()[field] is None
    assert getattr(stored(), field) is None


def test_prefixes_keep_their_case(api):
    reply = api.patch(SETTINGS, json={"quote_prefix": "qt-", "invoice_prefix": "Inv-"})
    assert (reply.json()["quote_prefix"], reply.json()["invoice_prefix"]) == ("qt-", "Inv-")


@pytest.mark.parametrize(
    ("thousandths", "text"), [(8875, "8.875"), (8500, "8.5"), (8050, "8.05"), (20000, "20"), (0, "0")]
)
def test_the_tax_rate_goes_back_as_the_shortest_text(thousandths, text):
    assert company.tax_rate_text(thousandths) == text
    assert company.tax_rate_thousandths(text) == thousandths


# Who and when (B7)


def test_a_new_database_has_settings_nobody_has_changed(api):
    reply = api.get(SETTINGS).json()
    assert reply["company_name"] == "Your company"
    assert reply["updated_by"] is None


def test_a_save_that_changes_something_records_who_and_when(api):
    reply = api.patch(SETTINGS, json={"phone": "(718) 555-0199"}).json()
    assert reply["updated_by"] == {"id": ALEX.id, "name": ALEX.name}
    assert reply["updated_at"] == "2026-10-31T15:00:00Z"


@pytest.mark.parametrize(
    "same",
    [
        {"tax_rate": "8.875"},
        {"tax_rate": " 8.875 "},
        {"phone": " (718) 555-0199 "},
        {"company_name": "Your company"},
        {},
    ],
)
def test_a_save_that_alters_nothing_leaves_who_and_when_alone(api, sign_in_as, same):
    api.patch(SETTINGS, json={"tax_rate": "8.875", "phone": "(718) 555-0199"})
    before = api.get(SETTINGS).json()

    reply = as_dana(api, sign_in_as).patch(SETTINGS, json=same).json()

    assert (reply["updated_by"], reply["updated_at"]) == (before["updated_by"], before["updated_at"])


def test_a_body_naming_someone_else_changes_nothing_about_who(api):
    reply = api.patch(SETTINGS, json={"phone": "1", "updated_by": DANA.id, "updated_at": "2020-01-01T00:00:00Z"})
    assert reply.json()["updated_by"]["id"] == ALEX.id
    assert stored().updated_at == NOW


# One set for everyone, and only what's sent (B1, B8)


def test_settings_saved_by_one_teammate_are_what_another_sees(api, sign_in_as):
    api.patch(SETTINGS, json={"company_name": "Harbor Works"})
    seen = as_dana(api, sign_in_as).get(SETTINGS).json()
    assert seen["company_name"] == "Harbor Works"
    assert seen["updated_by"] == {"id": ALEX.id, "name": ALEX.name}


def test_a_later_save_by_someone_else_records_them(api, sign_in_as):
    api.patch(SETTINGS, json={"phone": "1"})
    reply = as_dana(api, sign_in_as).patch(SETTINGS, json={"phone": "2"}).json()
    assert reply["updated_by"] == {"id": DANA.id, "name": DANA.name}
    assert reply["updated_at"] == "2026-10-31T17:00:00Z"


def test_two_saves_of_different_fields_both_stick(api):
    api.patch(SETTINGS, json={"phone": "(718) 555-0101"})
    api.patch(SETTINGS, json={"email": "billing@fieldstone.example"})
    reply = api.get(SETTINGS).json()
    assert (reply["phone"], reply["email"]) == ("(718) 555-0101", "billing@fieldstone.example")
    assert reply["company_name"] == "Your company"


def test_missing_settings_say_so_rather_than_inventing_some(api):
    with db.writing() as conn:
        conn.execute(delete(company.company_settings))
    reply = api.get(SETTINGS)
    assert (reply.status_code, reply.json()["detail"]) == (500, "The company settings are missing.")
