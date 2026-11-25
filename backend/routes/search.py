from fastapi import APIRouter

from backend.services.search import search as run_search

router = APIRouter(tags=["search"])


@router.get("/search")
def search(q: str = ""):
    """API-21: up to 5 organizations, contacts and deals whose name contains q."""
    return run_search(q)
