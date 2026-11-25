"""The FastAPI app.

On startup it runs any missing migrations, then seeds a brand-new database, but
never reseeds an existing one (RUN-05). Every route under /api needs a signed-in
user (AUTH-01). When the frontend has been built, it serves that too (ARC-18).
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend import db, settings
from backend.auth import current_user
from backend.routes import (
    activities,
    contacts,
    dashboard,
    deals,
    me,
    meta,
    organizations,
    search,
)
from backend.schemas import errors_by_field
from backend.services.common import NotFound, ValidationFailed

log = logging.getLogger("accountable")

DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def prepare_database() -> bool:
    """Run the migrations; load the sample data only if the database was new.
    Returns True when it seeded."""
    settings.load()  # refuses local mode on Postgres before touching anything (DEC-19)
    is_new = db.run_migrations()
    if is_new:
        from backend.seed import seed_database

        seed_database()
    return is_new


@asynccontextmanager
async def lifespan(_app: FastAPI):
    prepare_database()
    yield


app = FastAPI(title="Accountable", lifespan=lifespan)

# One router for the whole API, so no route can miss the sign-in check (ARC-19).
api = APIRouter(prefix="/api", dependencies=[Depends(current_user)])
for module in (organizations, contacts, deals, activities, dashboard, meta, me, search):
    api.include_router(module.router)
app.include_router(api)
app.include_router(me.local_router)


@app.exception_handler(RequestValidationError)
async def on_validation_error(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Check the highlighted fields", "errors": errors_by_field(exc.errors())},
    )


@app.exception_handler(ValidationFailed)
async def on_rule_error(_request: Request, exc: ValidationFailed):
    return JSONResponse(
        status_code=422, content={"detail": "Check the highlighted fields", "errors": exc.errors}
    )


@app.exception_handler(NotFound)
async def on_not_found(_request: Request, exc: NotFound):
    return JSONResponse(status_code=404, content={"detail": f"That {exc.what} doesn't exist"})


@app.exception_handler(StarletteHTTPException)
async def on_http_error(_request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc.detail)})


@app.exception_handler(Exception)
async def on_error(_request: Request, exc: Exception):
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server"})


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    """ARC-18: the built frontend. A file is served as itself; any other address
    outside /api gets index.html, so React Router handles it. The files hold no
    data, so they're served to anyone, and the sign-in screen can load."""
    index = DIST / "index.html"
    if path == "api" or path.startswith("api/") or not index.is_file():
        raise HTTPException(status_code=404, detail="Not Found")
    root = DIST.resolve()
    wanted = (root / path).resolve()
    if path and wanted.is_file() and wanted.is_relative_to(root):
        return FileResponse(wanted)
    return FileResponse(index)
