"""Startup migrates and seeds a new database, and never reseeds an existing one (RUN-05)."""

from backend import db


def test_missing_file_is_created_and_seeded(fresh_db, monkeypatch, client):
    path = fresh_db / "new" / "accountable.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    assert not path.exists()
    with client:
        assert path.exists()
        assert len(client.get("/api/organizations").json()) == 10
        assert len(client.get("/api/deals").json()) == 30


def test_existing_file_is_not_reseeded(fresh_db, monkeypatch, client):
    path = fresh_db / "keep.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    with client:
        org = client.get("/api/organizations").json()[0]
        assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
        client.post("/api/organizations", json={"name": "Made between starts"})
    db.dispose_engines()
    with client:
        names = [o["name"] for o in client.get("/api/organizations").json()]
        assert "Made between starts" in names
        assert org["name"] not in names
        assert len(names) == 10
