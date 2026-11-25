from fastapi import APIRouter

from backend.services.dashboard import get_dashboard

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard():
    return get_dashboard()
