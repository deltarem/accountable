import io
from typing import cast

import pytest
from accountable import cli, db, users
from accountable.crm import sample_data
from accountable.crm.tables import activities, contacts, deals, name_key, organizations, products, stage_changes
from conftest import TODAY, copy_of_migrated, insert_row, prebuilt, using_database
from sqlalchemy import Connection, func, insert, select

RECORDS = [table for table in db.metadata.sorted_tables if table.name != "users"]
# Taken before quick_seeding stands in for it, so a test can still check what it does.
REAL_FILL_SAMPLE = cli.fill_sample


def _seed(path) -> None:
    copy_of_migrated(path)
    with using_database(path), db.writing() as conn:
        sample_data.fill(conn, TODAY)


prebuilt.register("seeded-for-cli", _seed, used_by="quick_seeding")


@pytest.fixture(scope="module")
def seeded() -> dict[str, list[dict]]:
    with using_database(prebuilt.path("seeded-for-cli")), db.reading() as source:
        return {table.name: [row._asdict() for row in source.execute(select(table))] for table in RECORDS}


@pytest.fixture(autouse=True)
def quick_seeding(seeded, monkeypatch) -> None:
    """Seeding copies rows seeded once before the tests, as seeding takes about a second.
    These tests are about the commands, and test_sample_data.py tests what seeding puts in."""

    def copy_seeded(conn: Connection) -> None:
        sample_data.add_missing_teammates(conn)
        for table in RECORDS:
            if seeded[table.name]:
                conn.execute(insert(table), seeded[table.name])

    monkeypatch.setattr(cli, "fill_sample", copy_seeded)


def counts() -> dict[str, int]:
    with db.reading() as conn:
        return {
            table.name: conn.execute(select(func.count()).select_from(table)).scalar_one()
            for table in (organizations, contacts, deals, activities, stage_changes, products)
        }


def answer(monkeypatch, text: str) -> None:
    monkeypatch.setattr("sys.stdin", io.StringIO(text))


@pytest.fixture
def with_records(make):
    organization = make.organization()
    contact = make.contact(organization_id=organization)
    deal = make.deal(organization_id=organization, main_contact_id=contact)
    make.activity(deal_id=deal)
    with db.writing() as conn:
        insert_row(conn, products, name="Training day", name_key=name_key("Training day"), unit_price_cents=145000)


EMPTY = {"organizations": 0, "contacts": 0, "deals": 0, "activities": 0, "stage_changes": 0, "products": 0}


@pytest.mark.parametrize("command", ["seed", "empty"])
def test_shows_what_will_be_lost_and_needs_yes(with_records, monkeypatch, capsys, command):
    answer(monkeypatch, "yes\n")
    assert cli.main([command]) == 0
    output = capsys.readouterr().out
    assert "1 organization, 1 contact, 1 deal, 1 activity, 1 product" in output
    assert "can't be undone" in output


def test_counts_read_naturally_when_there_are_several(make, monkeypatch, capsys):
    make.organization()
    make.organization()
    answer(monkeypatch, "no\n")
    cli.main(["empty"])
    assert "2 organizations, 0 contacts, 0 deals, 0 activities, 0 products" in capsys.readouterr().out


def test_seed_replaces_everything_with_the_sample_data(with_records, monkeypatch):
    answer(monkeypatch, "yes\n")
    cli.main(["seed"])
    after = counts()
    assert (after["organizations"], after["contacts"], after["deals"], after["activities"]) == (24, 75, 80, 300)
    assert after["products"] == 12


def test_empty_removes_every_record(with_records, monkeypatch):
    answer(monkeypatch, "yes\n")
    cli.main(["empty"])
    assert counts() == EMPTY


@pytest.mark.parametrize("command", ["seed", "empty"])
@pytest.mark.parametrize("reply", ["no\n", "y\n", "\n", "YESS\n"])
def test_any_other_answer_wipes_nothing(with_records, monkeypatch, command, reply):
    before = counts()
    answer(monkeypatch, reply)
    assert cli.main([command]) == 1
    assert counts() == before


@pytest.mark.parametrize("command", ["seed", "empty"])
def test_nobody_at_the_keyboard_wipes_nothing(with_records, monkeypatch, capsys, command):
    before = counts()
    answer(monkeypatch, "")
    assert cli.main([command]) == 1
    assert counts() == before
    assert "nothing was changed" in capsys.readouterr().out.lower()


def test_yes_flag_skips_the_question(with_records, monkeypatch):
    def no_question(*_args):
        raise AssertionError("asked a question")

    monkeypatch.setattr("builtins.input", no_question)
    assert cli.main(["empty", "--yes"]) == 0
    assert counts() == EMPTY


@pytest.mark.parametrize("command", ["seed", "empty"])
def test_works_with_the_apps_connection_open(with_records, command):
    with db.engine().connect() as appconnection:
        appconnection.execute(select(organizations)).all()
        assert cli.main([command, "--yes"]) == 0


def test_leaves_the_file_and_tables_in_place(with_records, database):
    before = database.stat().st_ino
    cli.main(["empty", "--yes"])
    assert database.stat().st_ino == before
    assert counts() == EMPTY


def everyone() -> set[str]:
    with db.reading() as conn:
        return set(conn.scalars(select(users.users.c.id)))


@pytest.mark.parametrize("command", ["seed", "empty"])
def test_the_teammates_and_everyone_else_who_signed_in_stay(with_records, command):
    with db.writing() as conn:
        sample_data.add_missing_teammates(conn)
        users.remember(conn, "someone-real", "Sam Real", "sam@company.example")
    before = everyone()

    assert cli.main([command, "--yes"]) == 0

    assert everyone() == before
    assert {teammate.id for teammate in sample_data.TEAMMATES} <= before


@pytest.mark.parametrize("command", ["seed", "empty"])
@pytest.mark.parametrize("address", ["postgresql://someone@db.example/postgres", ""])
def test_refuses_with_the_shared_apps_database_set(with_records, monkeypatch, capsys, command, address):
    before = counts()
    with monkeypatch.context() as patch:
        patch.setenv("DATABASE_URL", address)
        patch.setattr("builtins.input", lambda *_args: "yes")
        assert cli.main([command]) == 2
    assert counts() == before
    assert "nothing was changed" in capsys.readouterr().err.lower()


def test_seed_before_the_first_start_builds_the_database(tmp_path, monkeypatch, capsys, quick_migrations):
    path = tmp_path / "first.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    db.dispose()
    assert cli.main(["seed"]) == 0
    assert counts()["deals"] == 80
    assert everyone() == {teammate.id for teammate in sample_data.TEAMMATES}
    assert "Sample data added" in capsys.readouterr().out
    db.dispose()


def test_empty_before_the_first_start_leaves_an_empty_database(tmp_path, monkeypatch, quick_migrations):
    path = tmp_path / "first.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    db.dispose()
    assert cli.main(["empty"]) == 0
    assert path.exists()
    assert counts() == EMPTY
    assert everyone() == {teammate.id for teammate in sample_data.TEAMMATES}
    db.dispose()


def test_seeding_fills_the_sample_data_dated_today_in_the_teams_zone(monkeypatch):
    filled = []
    monkeypatch.setattr(sample_data, "fill", lambda conn, today: filled.append((conn, today)))
    connection = cast(Connection, object())
    REAL_FILL_SAMPLE(connection)
    assert filled == [(connection, db.local_today())]
