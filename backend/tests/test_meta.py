from datetime import date


def test_today_without_fixed_date_is_the_computers(client, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_TODAY", raising=False)
    body = client.get("/api/today").json()
    assert body["today"] == date.today().isoformat()
    assert body["now"].startswith(body["today"])


def test_today_with_fixed_date(client, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2026-11-23")
    body = client.get("/api/today").json()
    assert body["today"] == "2026-11-23"
    assert body["now"].startswith("2026-11-23T")


def test_fixed_date_and_time(client):
    assert client.get("/api/today").json() == {"today": "2026-11-23", "now": "2026-11-23T14:00:00"}


def test_industries_once_each_sorted_no_blanks(api, client):
    api.org("A", industry="Software")
    api.org("B", industry="finance")
    api.org("C", industry="Software")
    api.org("D", industry="  ")
    api.org("E")
    api.org("F", industry="Retail ")
    assert client.get("/api/industries").json() == ["finance", "Retail", "Software"]
