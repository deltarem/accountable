"""Every API route needs a signed-in user, and the user comes from the token only
(AUTH-01, AUTH-02, ARC-19)."""

import re

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.utils import base64url_decode, base64url_encode

from backend import auth
from backend.main import app
from backend.tests.tokens import (
    PRIYA,
    TEST_SUPABASE_URL,
    bearer,
    make_token,
    public_jwk,
)

SIGN_IN = {"detail": "Sign in to continue"}


def api_routes() -> list[tuple[str, str]]:
    """Every route under /api except the local sign-in, read from the app's own route
    list (its OpenAPI paths), so a new route can't be missed. Path parameters become 1:
    /api/deals/1/move."""
    found = []
    for path, operations in app.openapi()["paths"].items():
        if not path.startswith("/api/") or path.startswith("/api/local/"):
            continue
        concrete = re.sub(r"\{[^}]+\}", "1", path)
        found += [(method.upper(), concrete) for method in sorted(operations)]
    return found


ROUTES = api_routes()


def test_the_sweep_covers_the_api():
    paths = {p for _, p in ROUTES}
    assert {"/api/organizations", "/api/deals/1/move", "/api/me", "/api/today"} <= paths
    assert len(ROUTES) >= 25


@pytest.mark.parametrize(("method", "path"), ROUTES)
def test_every_route_refuses_without_a_token(anon_client, method, path):
    r = anon_client.request(method, path, json={})
    assert r.status_code == 401, r.text
    assert r.json() == SIGN_IN


def bad_tokens():
    other_key = ec.generate_private_key(ec.SECP256R1())
    good = make_token(PRIYA)
    head, body, signature = good.split(".")
    tampered_body = base64url_encode(
        base64url_decode(body).replace(b"user-priya", b"user-sam!")
    ).decode()
    return {
        "expired": make_token(PRIYA, expires_in=-60),
        "signed by another key": make_token(PRIYA, key=other_key),
        "tampered": f"{head}.{tampered_body}.{signature}",
        "wrong audience": make_token(PRIYA, aud="anon"),
        "wrong issuer": make_token(PRIYA, iss="https://elsewhere.invalid/auth/v1"),
        "not a token": "hello",
        "shared secret": jwt.encode(
            {"sub": "user-priya", "aud": "authenticated", "exp": 9_999_999_999},
            "a-shared-secret-of-enough-length-for-hs256",
            algorithm="HS256",
        ),
    }


@pytest.mark.parametrize("kind", list(bad_tokens()))
def test_bad_tokens_are_refused(anon_client, kind):
    token = bad_tokens()[kind]
    for method, path in [("GET", "/api/me"), ("GET", "/api/organizations")]:
        r = anon_client.request(method, path, headers=bearer(token))
        assert r.status_code == 401, (kind, r.text)
        assert r.json() == SIGN_IN


def test_a_token_needs_the_bearer_scheme(anon_client):
    token = make_token(PRIYA)
    assert anon_client.get("/api/me", headers={"Authorization": token}).status_code == 401
    assert (
        anon_client.get("/api/me", headers={"Authorization": f"Basic {token}"}).status_code == 401
    )
    assert anon_client.get("/api/me", headers=bearer(token)).status_code == 200


def test_the_user_comes_from_the_token_only(client):
    body = {"name": "Acme Ltd", "created_by": "user-sam", "updated_by": "user-sam"}
    r = client.post(
        "/api/organizations?user_id=user-sam",
        json=body,
        headers={"X-User-Id": "user-sam"},
    )
    assert r.status_code == 201
    org = r.json()
    assert org["created_by"] == "user-priya"
    assert org["updated_by"] == "user-priya"
    assert org["created_by_name"] == "Priya Shah"


def test_keys_are_fetched_once_and_kept(client, offline):
    for _ in range(3):
        assert client.get("/api/me").status_code == 200
    assert offline.count == 1


def test_an_unknown_key_id_fetches_the_keys_again(anon_client, offline, monkeypatch):
    monkeypatch.setattr(auth, "KEY_REFRESH_COOLDOWN", 0)
    assert anon_client.get("/api/me", headers=bearer(make_token(PRIYA))).status_code == 200
    assert offline.count == 1

    # Supabase rotates to a second key: the backend fetches the keys again and finds it.
    offline.keys = {"keys": [public_jwk(), public_jwk("test-key-2")]}
    rotated = make_token(PRIYA, kid="test-key-2")
    assert anon_client.get("/api/me", headers=bearer(rotated)).status_code == 200
    assert offline.count == 2

    # A key Supabase doesn't publish is refused, after one more look.
    unknown = make_token(PRIYA, kid="test-key-3")
    assert anon_client.get("/api/me", headers=bearer(unknown)).status_code == 401
    assert offline.count == 3


def test_made_up_key_ids_dont_flood_supabase(anon_client, offline):
    """Within the cooldown, an unknown key id doesn't fetch the keys again."""
    assert anon_client.get("/api/me", headers=bearer(make_token(PRIYA))).status_code == 200
    for n in range(3):
        token = make_token(PRIYA, kid=f"made-up-{n}")
        assert anon_client.get("/api/me", headers=bearer(token)).status_code == 401
    assert offline.count == 1


def test_keys_come_from_the_projects_address(client, offline):
    client.get("/api/me")
    assert auth._key_client(TEST_SUPABASE_URL).uri == (
        f"{TEST_SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    )
