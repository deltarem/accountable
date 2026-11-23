"""Each test gets a fresh temporary database and a fixed clock (ARC-12, ARC-14)."""

import pytest
from fastapi.testclient import TestClient

from backend import db
from backend.main import app

TODAY = "2026-11-23"
NOW = "2026-11-23T14:00:00"


@pytest.fixture(autouse=True)
def fresh_db(tmp_path, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", NOW)
    db.dispose_engines()
    db.create_tables()
    yield tmp_path
    db.dispose_engines()


@pytest.fixture
def client():
    # Not used as a context manager, so startup (and its seeding) doesn't run.
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
