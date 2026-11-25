"""The built-in test user, in local mode only (API-20, DEC-19)."""

import pytest

from backend import auth
from backend.tests.tokens import PRIYA, bearer, make_token

TEST_USER = {"email": "test@example.com", "password": "accountable"}


@pytest.fixture
def local(monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_LOCAL", "1")


def test_the_test_user_signs_in(local, anon_client):
    r = anon_client.post("/api/local/sign-in", json=TEST_USER)
    assert r.status_code == 200
    body = r.json()
    assert body["user"] == {
        "id": "local-test-user",
        "email": "test@example.com",
        "name": "Test User",
        "initials": "TU",
    }
    me = anon_client.get("/api/me", headers=bearer(body["access_token"]))
    assert me.json()["name"] == "Test User"


def test_the_email_ignores_case_and_spaces(local, anon_client):
    r = anon_client.post(
        "/api/local/sign-in", json={"email": " Test@Example.com ", "password": "accountable"}
    )
    assert r.status_code == 200


@pytest.mark.parametrize(
    "body",
    [
        {"email": "test@example.com", "password": "wrong"},
        {"email": "priya@company.com", "password": "accountable"},
        {"email": "", "password": ""},
        {},
    ],
)
def test_anything_else_is_wrong(local, anon_client, body):
    r = anon_client.post("/api/local/sign-in", json=body)
    assert r.status_code == 401
    assert r.json() == {"detail": "Email or password is wrong"}


def test_the_route_doesnt_exist_outside_local_mode(anon_client):
    r = anon_client.post("/api/local/sign-in", json=TEST_USER)
    assert r.status_code == 404


def test_a_local_token_is_refused_outside_local_mode(local, anon_client, monkeypatch):
    token = anon_client.post("/api/local/sign-in", json=TEST_USER).json()["access_token"]
    monkeypatch.delenv("ACCOUNTABLE_LOCAL")
    assert anon_client.get("/api/me", headers=bearer(token)).status_code == 401


def test_a_supabase_token_is_refused_in_local_mode(local, anon_client):
    assert anon_client.get("/api/me", headers=bearer(make_token(PRIYA))).status_code == 401


def test_local_mode_ignores_supabase(local, anon_client, offline):
    token = auth.local_token()
    assert anon_client.get("/api/organizations", headers=bearer(token)).status_code == 200
    assert offline.count == 0


def test_the_test_user_is_written_to_users(local, anon_client):
    token = anon_client.post("/api/local/sign-in", json=TEST_USER).json()["access_token"]
    org = anon_client.post(
        "/api/organizations", json={"name": "Acme Ltd"}, headers=bearer(token)
    ).json()
    assert org["created_by_name"] == "Test User"
