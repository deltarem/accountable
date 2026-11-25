"""FastAPI serves the built frontend, with index.html for the app's addresses
(ARC-18, RUN-14)."""

import pytest

from backend import main


@pytest.fixture
def dist(tmp_path, monkeypatch):
    folder = tmp_path / "dist"
    (folder / "assets").mkdir(parents=True)
    (folder / "index.html").write_text("<!doctype html><title>Accountable</title>")
    (folder / "assets" / "app.js").write_text("console.log('app')")
    (tmp_path / "secret.txt").write_text("outside dist")
    monkeypatch.setattr(main, "DIST", folder)
    return folder


def test_app_addresses_get_index_html(dist, anon_client):
    for path in ("/", "/deals/12", "/organizations", "/no/such/page"):
        r = anon_client.get(path)
        assert r.status_code == 200, path
        assert "<title>Accountable</title>" in r.text


def test_files_are_served_as_themselves(dist, anon_client):
    r = anon_client.get("/assets/app.js")
    assert r.status_code == 200
    assert r.text == "console.log('app')"
    assert "javascript" in r.headers["content-type"]


def test_the_files_need_no_sign_in(dist, anon_client):
    assert anon_client.get("/deals/12").status_code == 200
    assert anon_client.get("/api/deals/12").status_code == 401


def test_an_unknown_api_address_is_a_json_404(dist, client):
    r = client.get("/api/no-such-thing")
    assert r.status_code == 404
    assert r.json() == {"detail": "Not Found"}


def test_nothing_outside_dist_is_served(dist, anon_client):
    r = anon_client.get("/..%2Fsecret.txt")
    assert "outside dist" not in r.text


def test_without_a_build_nothing_is_served(tmp_path, monkeypatch, anon_client):
    monkeypatch.setattr(main, "DIST", tmp_path / "missing")
    assert anon_client.get("/deals/12").status_code == 404
