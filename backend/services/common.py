"""Errors and small helpers shared by the services."""

from sqlalchemy import select


class NotFound(Exception):
    def __init__(self, what: str = "record"):
        super().__init__(f"No such {what}")
        self.what = what


class ValidationFailed(Exception):
    """A rule that needs the database, reported per field like a 422."""

    def __init__(self, errors: dict[str, str]):
        super().__init__("Check the highlighted fields")
        self.errors = errors


def one(conn, table, record_id: int, what: str) -> dict:
    row = conn.execute(select(table).where(table.c.id == record_id)).mappings().first()
    if row is None:
        raise NotFound(what)
    return dict(row)


def exists(conn, table, record_id: int) -> bool:
    return conn.execute(select(table.c.id).where(table.c.id == record_id)).first() is not None
