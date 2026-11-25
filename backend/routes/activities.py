from fastapi import APIRouter

from backend.auth import SignedIn
from backend.schemas import ActivityIn, DoneIn
from backend.services import activities as svc

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("", status_code=201)
def create_activity(body: ActivityIn, user: SignedIn):
    return svc.create_activity(body, user.id)


@router.put("/{activity_id}")
def update_activity(activity_id: int, body: ActivityIn, user: SignedIn):
    return svc.update_activity(activity_id, body, user.id)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int):
    svc.delete_activity(activity_id)


@router.post("/{activity_id}/done")
def set_done(activity_id: int, body: DoneIn, user: SignedIn):
    return svc.set_done(activity_id, body.done, user.id)
