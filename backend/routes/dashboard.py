from fastapi import APIRouter

from backend.services.dashboard import get_dashboard

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard():
    return get_dashboard()
