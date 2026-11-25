"""The signed-in person and the users table (API-19, DEC-18, DM-07, UI-MENU-01)."""

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend import db
from backend.auth import initials
from backend.db import users
from backend.main import app
from backend.tests.tokens import PRIYA, Person, bearer, make_token


def user_rows():
    with db.reading() as conn:
        return [dict(r) for r in conn.execute(select(users).order_by(users.c.id)).mappings()]


def test_me_gives_who_is_signed_in(client):
    assert client.get("/api/me").json() == {
        "id": "user-priya",
        "email": "priya@company.com",
        "name": "Priya Shah",
        "initials": "PS",
    }


def test_the_name_falls_back_to_the_email(anon_client):
    token = make_token(Person("user-p", "priya@company.com", None))
    me = anon_client.get("/api/me", headers=bearer(token)).json()
    assert me["name"] == "priya"
    assert me["initials"] == "PR"


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Priya Shah", "PS"),
        ("priya", "PR"),
        ("Maria de la Cruz", "MC"),
        ("  sam   lee ", "SL"),
        ("x", "X"),
        ("", "?"),
    ],
)
def test_initials(name, expected):
    assert initials(name) == expected


def test_signing_in_adds_the_person_to_users(client):
    assert user_rows() == []
    client.get("/api/me")
    [row] = user_rows()
    assert (row["id"], row["email"], row["name"]) == (
        "user-priya",
        "priya@company.com",
        "Priya Shah",
    )


def test_a_changed_display_name_shows_on_their_records(client, anon_client):
    org = client.post("/api/organizations", json={"name": "Acme Ltd"}).json()
    assert org["created_by_name"] == "Priya Shah"
    renamed = make_token(replace(PRIYA, name="Priya Shah-Patel"))
    assert anon_client.get("/api/me", headers=bearer(renamed)).json()["initials"] == "PS"
    [row] = user_rows()
    assert row["name"] == "Priya Shah-Patel"
    again = anon_client.get(f"/api/organizations/{org['id']}", headers=bearer(renamed)).json()
    assert again["created_by_name"] == "Priya Shah-Patel"


def test_an_unchanged_person_writes_nothing(client, monkeypatch):
    client.get("/api/me")
    writes = []
    real = db.transaction
    monkeypatch.setattr(db, "transaction", lambda: writes.append(1) or real())
    for _ in range(3):
        client.get("/api/me")
    assert writes == []


def test_a_new_database_learns_the_person_again(client, fresh_db, monkeypatch):
    """The in-memory note of who's been written is per database."""
    client.get("/api/me")
    monkeypatch.setenv("ACCOUNTABLE_DB", str(fresh_db / "second.db"))
    db.dispose_engines()
    db.create_tables()
    client.get("/api/me")
    assert [r["id"] for r in user_rows()] == ["user-priya"]


def test_two_people(client, other_client):
    client.get("/api/me")
    assert other_client.get("/api/me").json()["name"] == "Sam Lee"
    assert [r["id"] for r in user_rows()] == ["user-priya", "user-sam"]


def test_a_removed_persons_name_stays(client):
    """Removing someone in Supabase stops their token working; their name stays."""
    org = client.post("/api/organizations", json={"name": "Acme Ltd"}).json()
    nobody = TestClient(app)
    assert nobody.get(f"/api/organizations/{org['id']}").status_code == 401
    assert client.get(f"/api/organizations/{org['id']}").json()["created_by_name"] == "Priya Shah"
