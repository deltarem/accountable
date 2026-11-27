"""The price list (G1 to G11). Products are archived rather than deleted, so there's no delete route (G9)."""

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import Connection, insert, select, update
from sqlalchemy.exc import IntegrityError

from accountable import db
from accountable.auth import CurrentUser
from accountable.crm import schemas, who
from accountable.crm.tables import name_key, products

router = APIRouter(prefix="/products")

_with_names = who.with_names(select(products), products)


def _get(conn: Connection, product_id: int) -> Any:
    row = conn.execute(_with_names.where(products.c.id == product_id)).one_or_none()
    if row is None:
        raise HTTPException(404, "Product not found")
    return row


def _detail(row: Any) -> schemas.ProductDetail:
    return schemas.ProductDetail(**{**row._mapping, **who.authorship(row)})


def _holder(conn: Connection, name: str, leaving_out: int | None = None) -> Any:
    """The product, active or archived, that already has this name in any case, other than the one being saved."""
    query = select(products.c.name, products.c.active).where(products.c.name_key == name_key(name))
    if leaving_out is not None:
        query = query.where(products.c.id != leaving_out)
    return conn.execute(query).first()


def _name_taken(holder: Any) -> schemas.FieldError:
    if holder.active:
        message = f"There's already a product called {holder.name}."
    else:
        message = f"An archived product is already called {holder.name}. Restore it or choose another name."
    return schemas.FieldError({"name": message})


def _refuse_a_taken_name(conn: Connection, name: str, leaving_out: int | None = None) -> None:
    holder = _holder(conn, name, leaving_out)
    if holder is not None:
        raise _name_taken(holder)


@contextmanager
def _unique_name(name: str | None) -> Generator[None]:
    """The database's own refusal of a second copy of a name, given the same 422 as the routes' check.

    Writes take turns, so only a write from outside the app can get past the check to here.
    """
    try:
        yield
    except IntegrityError as error:
        with db.reading() as conn:
            holder = _holder(conn, name) if name is not None else None
        if holder is None:
            raise
        raise _name_taken(holder) from error


@router.get("")
def list_products() -> list[schemas.Product]:
    with db.reading() as conn:
        rows = conn.execute(select(products).order_by(products.c.name_key, products.c.id)).all()
    return [schemas.Product(**row._mapping) for row in rows]


@router.post("", status_code=201)
def add_product(body: schemas.ProductCreate, user: CurrentUser, now: schemas.Now) -> schemas.ProductDetail:
    with _unique_name(body.name), db.writing() as conn:
        _refuse_a_taken_name(conn, body.name)
        new_id = conn.execute(
            insert(products)
            .values(**body.model_dump(), name_key=name_key(body.name), **who.added(user, now))
            .returning(products.c.id)
        ).scalar_one()
        return _detail(_get(conn, new_id))


@router.get("/{product_id}")
def get_product(product_id: schemas.PathId) -> schemas.ProductDetail:
    with db.reading() as conn:
        return _detail(_get(conn, product_id))


@router.patch("/{product_id}")
def edit_product(
    product_id: schemas.PathId, body: schemas.ProductUpdate, user: CurrentUser, now: schemas.Now
) -> schemas.ProductDetail:
    """Archiving and restoring are edits of `active`, so they count as changes like any other (U10)."""
    fields = body.model_dump(exclude_unset=True)
    with _unique_name(fields.get("name")), db.writing() as conn:
        altered = who.alterations(fields, _get(conn, product_id))
        if "name" in altered:
            _refuse_a_taken_name(conn, altered["name"], leaving_out=product_id)
            altered["name_key"] = name_key(altered["name"])
        if altered:
            conn.execute(
                update(products).where(products.c.id == product_id).values(**altered, **who.changed(user, now))
            )
        return _detail(_get(conn, product_id))
