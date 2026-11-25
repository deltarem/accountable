"""Names of the people who added and changed records (DEC-18, DM-08).

Records point to `users` by id. Reads swap the ids for names, as
`created_by_name` and `updated_by_name`. Sample records have no author, so both
are None, which the screens show as "Sample data".
"""

from sqlalchemy import select

from backend.db import users


def name_map(conn) -> dict[str, str]:
    return dict(conn.execute(select(users.c.id, users.c.name)).all())


def with_names(item: dict, names: dict[str, str]) -> dict:
    item["created_by_name"] = names.get(item.get("created_by"))
    if "updated_by" in item:
        item["updated_by_name"] = names.get(item["updated_by"])
    return item
