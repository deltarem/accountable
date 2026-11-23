from fastapi import APIRouter

from backend import clock
from backend.services.organizations import industries

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/today")
def today():
    """API-18: today and now from the one clock, so the browser never uses its own."""
    now = clock.now()
    return {"today": now.date().isoformat(), "now": now.isoformat(timespec="seconds")}


@router.get("/industries")
def list_industries():
    return industries()
