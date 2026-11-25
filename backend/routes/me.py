from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend import settings
from backend.auth import (
    LOCAL_EMAIL,
    LOCAL_NAME,
    LOCAL_PASSWORD,
    LOCAL_USER_ID,
    CurrentUser,
    SignedIn,
    local_token,
    remember_user,
)

router = APIRouter(tags=["me"])

# Outside the signed-in /api router: it's how the test user signs in.
local_router = APIRouter(prefix="/api/local", tags=["me"])


def person(user: CurrentUser) -> dict:
    return {"id": user.id, "email": user.email, "name": user.name, "initials": user.initials}


@router.get("/me")
def me(user: SignedIn):
    """API-19: the signed-in person."""
    return person(user)


class SignIn(BaseModel):
    email: str = ""
    password: str = ""


@local_router.post("/sign-in")
def local_sign_in(body: SignIn):
    """API-20: local mode only. Outside it, the route doesn't exist."""
    if not settings.load().local:
        raise HTTPException(status_code=404, detail="Not Found")
    if body.email.strip().lower() != LOCAL_EMAIL or body.password != LOCAL_PASSWORD:
        raise HTTPException(status_code=401, detail="Email or password is wrong")
    user = CurrentUser(id=LOCAL_USER_ID, email=LOCAL_EMAIL, name=LOCAL_NAME)
    remember_user(user)
    return {"access_token": local_token(), "user": person(user)}
