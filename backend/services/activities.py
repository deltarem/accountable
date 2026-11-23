"""Activities: log, edit, delete, mark a follow-up done (API-12 to API-14)."""

from sqlalchemy import delete, insert, update

from backend import clock, db
from backend.db import activities, contacts, deals
from backend.schemas import ActivityIn
from backend.services.common import ValidationFailed, exists, one


def _check_links(conn, data: ActivityIn) -> None:
    if data.contact_id is not None and not exists(conn, contacts, data.contact_id):
        raise ValidationFailed({"record": "That contact no longer exists"})
    if data.deal_id is not None and not exists(conn, deals, data.deal_id):
        raise ValidationFailed({"record": "That deal no longer exists"})


def get_activity(activity_id: int) -> dict:
    with db.reading() as conn:
        return one(conn, activities, activity_id, "activity")


def create_activity(data: ActivityIn) -> dict:
    at = clock.now()
    with db.transaction() as conn:
        _check_links(conn, data)
        new_id = conn.execute(
            insert(activities).values(**data.model_dump(), created_at=at, updated_at=at)
        ).inserted_primary_key[0]
    return get_activity(new_id)


def update_activity(activity_id: int, data: ActivityIn) -> dict:
    with db.transaction() as conn:
        one(conn, activities, activity_id, "activity")
        _check_links(conn, data)
        conn.execute(
            update(activities)
            .where(activities.c.id == activity_id)
            .values(**data.model_dump(), updated_at=clock.now())
        )
    return get_activity(activity_id)


def delete_activity(activity_id: int) -> None:
    with db.transaction() as conn:
        one(conn, activities, activity_id, "activity")
        conn.execute(delete(activities).where(activities.c.id == activity_id))


def set_done(activity_id: int, done: bool) -> dict:
    with db.transaction() as conn:
        one(conn, activities, activity_id, "activity")
        conn.execute(
            update(activities)
            .where(activities.c.id == activity_id)
            .values(follow_up_done=done, updated_at=clock.now())
        )
    return get_activity(activity_id)
