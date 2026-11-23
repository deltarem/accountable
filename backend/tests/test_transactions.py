"""A delete or a move that fails after its first write changes nothing (DM-06)."""

from contextlib import contextmanager

import pytest
from sqlalchemy import select
from sqlalchemy.sql.dml import UpdateBase

from backend import db
from backend.services import contacts as contact_svc
from backend.services import deals as deal_svc


class Boom(Exception):
    pass


class FailAfterFirstWrite:
    """Wraps a connection so the second write raises."""

    def __init__(self, conn):
        self._conn = conn
        self.writes = 0

    def execute(self, statement, *args, **kwargs):
        if isinstance(statement, UpdateBase):
            self.writes += 1
            if self.writes > 1:
                raise Boom("failed partway")
        return self._conn.execute(statement, *args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._conn, name)


@pytest.fixture
def failing(monkeypatch):
    real = db.transaction

    @contextmanager
    def transaction():
        with real() as conn:
            yield FailAfterFirstWrite(conn)

    def arm():
        monkeypatch.setattr(db, "transaction", transaction)

    return arm


def snapshot():
    with db.reading() as conn:
        return {t.name: [tuple(r) for r in conn.execute(select(t).order_by(t.c.id))] for t in db.ALL_TABLES}


def test_failed_contact_delete_changes_nothing(api, failing):
    c = api.contact()
    api.deal(contact_id=c["id"])
    api.activity(contact_id=c["id"])
    api.activity("Two", contact_id=c["id"])
    before = snapshot()
    failing()
    with pytest.raises(Boom):
        contact_svc.delete_contact(c["id"])
    assert snapshot() == before


def test_failed_move_changes_nothing(api, failing):
    c = api.contact()
    org = api.org()
    a = api.deal("A", organization_id=org["id"], contact_id=c["id"])
    api.deal("B", organization_id=org["id"])
    api.deal("C", organization_id=org["id"], stage="won")
    before = snapshot()
    failing()
    with pytest.raises(Boom):
        deal_svc.move_deal(a["id"], "won", 0)
    assert snapshot() == before
