"""The search in the top bar (DEC-21, API-21, ARC-20)."""

import pytest

EMPTY = {"organizations": [], "contacts": [], "deals": []}


def names(result, group):
    return [r["name"] for r in result[group]]


@pytest.fixture
def find(api):
    return lambda q: api.ok(api.c.get("/api/search", params={"q": q}))


def test_part_of_a_name_in_any_case(api, find):
    acme = api.org("Acme Ltd", industry="Software")
    api.contact("Maria Lopez", organization_id=acme["id"])
    api.deal("Acme renewal", organization_id=acme["id"], stage="negotiation")
    for q in ("acme", "ACM", "cMe"):
        result = find(q)
        assert names(result, "organizations") == ["Acme Ltd"], q
        assert names(result, "deals") == ["Acme renewal"], q
    assert names(find("renew"), "deals") == ["Acme renewal"]
    assert names(find("LOPEZ"), "contacts") == ["Maria Lopez"]


def test_spaces_at_either_end_are_ignored(api, find):
    api.org("Acme Ltd")
    assert names(find("  acme  "), "organizations") == ["Acme Ltd"]


def test_letters_with_accents_fold_too(api, find):
    api.contact("Jürgen Müller")
    api.org("ÉCOLE Supérieure")
    assert names(find("müller"), "contacts") == ["Jürgen Müller"]
    assert names(find("MÜLLER"), "contacts") == ["Jürgen Müller"]
    assert names(find("école"), "organizations") == ["ÉCOLE Supérieure"]


def test_percent_and_underscore_are_plain_characters(api, find):
    api.org("100% Organic")
    api.org("Plain Foods")
    api.org("North_Star")
    api.org("NorthXStar")
    assert names(find("%"), "organizations") == ["100% Organic"]
    assert names(find("north_"), "organizations") == ["North_Star"]
    assert names(find("_"), "organizations") == ["North_Star"]


def test_starts_with_first_then_the_rest_each_a_to_z(api, find):
    for name in ("Big Acme", "acme west", "Acme East", "Zed Acme", "Acme"):
        api.org(name)
    assert names(find("acme"), "organizations") == [
        "Acme",
        "Acme East",
        "acme west",
        "Big Acme",
        "Zed Acme",
    ]


def test_at_most_five_per_group(api, find):
    for n in range(7):
        api.org(f"Acme {n}")
        api.contact(f"Acme person {n}")
    result = find("acme")
    assert len(result["organizations"]) == 5
    assert len(result["contacts"]) == 5
    assert names(result, "organizations") == [f"Acme {n}" for n in range(5)]


@pytest.mark.parametrize("q", ["", "   "])
def test_a_blank_search_finds_nothing(api, find, q):
    api.org("Acme Ltd")
    assert find(q) == EMPTY


def test_no_q_at_all_finds_nothing(api):
    api.org("Acme Ltd")
    assert api.get("/api/search") == EMPTY


def test_no_matches(api, find):
    api.org("Acme Ltd")
    assert find("xyz") == EMPTY


def test_each_result_has_its_id_name_and_context(api, find):
    acme = api.org("Acme Ltd", industry="Software")
    plain = api.org("Acme Plain")
    maria = api.contact("Acme Maria", organization_id=acme["id"])
    loner = api.contact("Acme Loner")
    deal = api.deal("Acme renewal", organization_id=acme["id"], stage="negotiation")
    gone = api.org("Gone Ltd")
    alone = api.deal("Acme alone", organization_id=gone["id"], stage="won")
    # Deleting an organization keeps its deals, with none (DEC-01).
    api.ok(api.c.delete(f"/api/organizations/{gone['id']}"), 204)
    result = find("acme")
    assert result["organizations"] == [
        {"id": acme["id"], "name": "Acme Ltd", "context": "Software"},
        {"id": plain["id"], "name": "Acme Plain", "context": None},
    ]
    assert result["contacts"] == [
        {"id": loner["id"], "name": "Acme Loner", "context": "No organization"},
        {"id": maria["id"], "name": "Acme Maria", "context": "Acme Ltd"},
    ]
    assert result["deals"] == [
        {"id": alone["id"], "name": "Acme alone", "context": "Won"},
        {"id": deal["id"], "name": "Acme renewal", "context": "Acme Ltd · Negotiation"},
    ]


def test_search_needs_sign_in(anon_client):
    assert anon_client.get("/api/search", params={"q": "acme"}).status_code == 401
