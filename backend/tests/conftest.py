"""Each test gets a fresh temporary database, a fixed clock and a signed-in client
(ARC-12, ARC-14).

No test may touch Supabase or the internet: the team's settings are removed from
the environment, the sign-in keys are the tests' own, and any connection to
anything but this computer fails the test.
"""

import socket
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from backend import auth, db
from backend.main import app
from backend.tests.tokens import (
    PRIYA,
    SAM,
    TEST_SUPABASE_URL,
    Person,
    bearer,
    make_token,
    published_keys,
)

TODAY = "2026-11-23"
NOW = "2026-11-23T14:00:00"

TEAM_SETTINGS = ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "ACCOUNTABLE_LOCAL")
LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}
_real_connect = socket.socket.connect


def _local_only(sock, address):
    host = address[0] if isinstance(address, tuple) else address
    if host not in LOCAL_HOSTS:
        raise RuntimeError(f"A test tried to connect to {host}; tests must stay offline (ARC-14)")
    return _real_connect(sock, address)


class KeyDownloads:
    """Stands in for Supabase's published keys, and counts how often they're fetched."""

    def __init__(self):
        self.count = 0
        self.keys = published_keys()

    def fetch(self, client):
        """Does what PyJWKClient.fetch_data does after a successful download."""
        self.count += 1
        if client.jwk_set_cache is not None:
            client.jwk_set_cache.put(self.keys)
        client._last_successful_fetch = time.monotonic()
        return self.keys


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    for name in TEAM_SETTINGS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("SUPABASE_URL", TEST_SUPABASE_URL)
    monkeypatch.setattr(socket.socket, "connect", _local_only)
    downloads = KeyDownloads()
    # A plain function, so Python passes the client in as `self`.
    monkeypatch.setattr(jwt.PyJWKClient, "fetch_data", lambda client: downloads.fetch(client))
    auth.forget_keys()
    auth.forget_users()
    return downloads


@pytest.fixture(autouse=True)
def fresh_db(tmp_path, monkeypatch, offline):
    monkeypatch.setenv("ACCOUNTABLE_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", NOW)
    db.dispose_engines()
    db.create_tables()
    yield tmp_path
    db.dispose_engines()


def signed_in(person: Person) -> TestClient:
    # Not used as a context manager, so startup (and its seeding) doesn't run.
    return TestClient(app, headers=bearer(make_token(person)))


@pytest.fixture
def client():
    """Signed in as Priya Shah."""
    return signed_in(PRIYA)


@pytest.fixture
def other_client():
    """Signed in as Sam Lee, a second person."""
    return signed_in(SAM)


@pytest.fixture
def anon_client():
    """Not signed in."""
    return TestClient(app)


class Api:
    def __init__(self, client):
        self.c = client

    def ok(self, response, status=200):
        assert response.status_code == status, response.text
        return response.json() if response.content else None

    def org(self, name="Acme Ltd", **kw):
        return self.ok(self.c.post("/api/organizations", json={"name": name, **kw}), 201)

    def contact(self, name="Maria Lopez", **kw):
        return self.ok(self.c.post("/api/contacts", json={"name": name, **kw}), 201)

    def deal(self, name="Acme renewal", organization_id=None, **kw):
        if organization_id is None:
            organization_id = self.org()["id"]
        body = {"name": name, "organization_id": organization_id, **kw}
        return self.ok(self.c.post("/api/deals", json=body), 201)

    def activity(
        self, description="Called them", type="call", occurred_at="2026-11-20T10:00:00", **kw
    ):
        body = {"type": type, "description": description, "occurred_at": occurred_at, **kw}
        return self.ok(self.c.post("/api/activities", json=body), 201)

    def get(self, path):
        return self.ok(self.c.get(path))

    def put_deal(self, deal, **changes):
        keys = [
            "name",
            "organization_id",
            "contact_id",
            "stage",
            "value_cents",
            "probability",
            "close_date",
        ]
        body = {k: deal[k] for k in keys}
        body.update(changes)
        return self.ok(self.c.put(f"/api/deals/{deal['id']}", json=body))

    def move(self, deal_id, stage, index=0):
        return self.ok(
            self.c.post(f"/api/deals/{deal_id}/move", json={"stage": stage, "index": index})
        )


@pytest.fixture
def api(client):
    return Api(client)
