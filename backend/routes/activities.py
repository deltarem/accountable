from fastapi import APIRouter

from backend.schemas import ActivityIn, DoneIn
from backend.services import activities as svc

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.post("", status_code=201)
def create_activity(body: ActivityIn):
    return svc.create_activity(body)


@router.put("/{activity_id}")
def update_activity(activity_id: int, body: ActivityIn):
    return svc.update_activity(activity_id, body)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int):
    svc.delete_activity(activity_id)


@router.post("/{activity_id}/done")
def set_done(activity_id: int, body: DoneIn):
    return svc.set_done(activity_id, body.done)
