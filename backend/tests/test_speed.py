"""With the sample data, every GET endpoint answers in under 200 ms (SC-09)."""

import time

from backend.seed import seed_database


def test_every_get_is_fast(client):
    seed_database()
    org_id = client.get("/api/organizations").json()[0]["id"]
    contact_id = client.get("/api/contacts").json()[0]["id"]
    deal_id = client.get("/api/deals").json()[0]["id"]
    paths = [
        "/api/organizations",
        f"/api/organizations/{org_id}",
        f"/api/organizations/{org_id}/delete-impact",
        "/api/contacts",
        f"/api/contacts/{contact_id}",
        f"/api/contacts/{contact_id}/delete-impact",
        "/api/deals",
        f"/api/deals/{deal_id}",
        f"/api/deals/{deal_id}/delete-impact",
        "/api/dashboard",
        "/api/industries",
        "/api/today",
    ]
    for path in paths:
        client.get(path)  # warm up
        started = time.perf_counter()
        r = client.get(path)
        elapsed = (time.perf_counter() - started) * 1000
        assert r.status_code == 200, path
        assert elapsed < 200, f"{path} took {elapsed:.0f} ms"
