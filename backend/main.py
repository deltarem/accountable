"""The FastAPI app. On startup it creates the tables and seeds a new database,
but never reseeds an existing one (RUN-05)."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend import db
from backend.routes import activities, contacts, dashboard, deals, meta, organizations
from backend.schemas import errors_by_field
from backend.services.common import NotFound, ValidationFailed

log = logging.getLogger("accountable")


def prepare_database() -> bool:
    """Create the tables; load the sample data only if the file is new.
    Returns True when it seeded."""
    is_new = not db.db_path().exists()
    db.create_tables()
    if is_new:
        from backend.seed import seed_database

        seed_database()
    return is_new


@asynccontextmanager
async def lifespan(_app: FastAPI):
    prepare_database()
    yield


app = FastAPI(title="Accountable", lifespan=lifespan)

for module in (organizations, contacts, deals, activities, dashboard, meta):
    app.include_router(module.router)


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
