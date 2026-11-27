"""The top bar's search: organizations, contacts, deals and active products by name (K1 to K5, G11)."""

import unicodedata
from collections.abc import Callable
from typing import Annotated, Any

from fastapi import APIRouter, Query
from pydantic import AfterValidator, BaseModel
from sqlalchemy import ColumnElement, CompoundSelect, Integer, Row, Text, cast, func, literal, null, select, union_all

from accountable import db
from accountable.crm.tables import contacts, deals, organizations, products

router = APIRouter()

SHOWN = 5
LONGEST = 100
LIKE_ESCAPE = "/"
KINDS = ("organizations", "contacts", "deals", "products")


def _search_text(value: str) -> str:
    value = value.strip()
    if not 1 <= len(value) <= LONGEST:
        raise ValueError(f"Search for 1 to {LONGEST} characters")
    if "\x00" in value:
        # Postgres can't hold it in text, so it would fail there and find nothing on SQLite.
        raise ValueError("Use plain text here")
    return value


SearchText = Annotated[str, Query(), AfterValidator(_search_text)]


class OrganizationResult(BaseModel):
    id: int
    name: str
    industry: str | None


class ContactResult(BaseModel):
    id: int
    name: str
    organization_name: str | None


class DealResult(BaseModel):
    id: int
    name: str
    stage: str
    organization_name: str | None


class ProductResult(BaseModel):
    id: int
    name: str
    unit_price_cents: int


class Group[Result: BaseModel](BaseModel):
    """How many of one kind match, and the first few in order."""

    count: int
    results: list[Result]


class SearchResults(BaseModel):
    organizations: Group[OrganizationResult]
    contacts: Group[ContactResult]
    deals: Group[DealResult]
    products: Group[ProductResult]


def _holding(name: ColumnElement[str], text: str) -> ColumnElement[bool]:
    """Names holding the text in any case, with the database's lower on both sides, so
    each database agrees with itself (K2). autoescape only takes a plain string, and
    this text goes through lower first, so % and _ are escaped here to match only themselves."""
    escaped = text.replace(LIKE_ESCAPE, LIKE_ESCAPE * 2)
    for wildcard in ("%", "_"):
        escaped = escaped.replace(wildcard, LIKE_ESCAPE + wildcard)
    return func.lower(name, type_=Text).contains(func.lower(escaped, type_=Text), escape=LIKE_ESCAPE)


def _blank_text() -> ColumnElement[Any]:
    """A column one side of the union doesn't have. Postgres won't guess its type the way SQLite does."""
    return cast(null(), Text)


def _blank_price() -> ColumnElement[Any]:
    return cast(null(), Integer)


def matching(text: str) -> CompoundSelect:
    """Every match of every kind, as one query, because each query crosses the internet in the shared app."""
    found_organizations = select(
        literal("organizations").label("kind"),
        organizations.c.id,
        organizations.c.name,
        organizations.c.industry.label("detail"),
        _blank_text().label("stage"),
        _blank_price().label("price"),
    ).where(_holding(organizations.c.name, text))
    found_contacts = (
        select(
            literal("contacts").label("kind"),
            contacts.c.id,
            contacts.c.name,
            organizations.c.name.label("detail"),
            _blank_text().label("stage"),
            _blank_price().label("price"),
        )
        .select_from(contacts.outerjoin(organizations, contacts.c.organization_id == organizations.c.id))
        .where(_holding(contacts.c.name, text))
    )
    found_deals = (
        select(
            literal("deals").label("kind"),
            deals.c.id,
            deals.c.name,
            organizations.c.name.label("detail"),
            deals.c.stage,
            _blank_price().label("price"),
        )
        .select_from(deals.outerjoin(organizations, deals.c.organization_id == organizations.c.id))
        .where(_holding(deals.c.name, text))
    )
    # Archived products are found from the Products table instead (G11).
    found_products = select(
        literal("products").label("kind"),
        products.c.id,
        products.c.name,
        _blank_text().label("detail"),
        _blank_text().label("stage"),
        products.c.unit_price_cents.label("price"),
    ).where(_holding(products.c.name, text), products.c.active)
    return union_all(found_organizations, found_contacts, found_deals, found_products)


def _alphabetical(name: str) -> tuple[str, str]:
    """Letters before their accents, so Émile sorts among the Es. Sorted here, not by
    the database, because SQLite's and Postgres's orders differ."""
    letters = "".join(char for char in unicodedata.normalize("NFKD", name) if not unicodedata.combining(char))
    return letters.casefold(), name


def _in_order(rows: list[Row], text: str) -> list[Row]:
    """Names that start with the text first, then the rest, each alphabetically (K4)."""
    start = text.lower()
    return sorted(rows, key=lambda row: (not row.name.lower().startswith(start), _alphabetical(row.name), row.id))


def _group[Result: BaseModel](rows: list[Row], result: Callable[[Row], Result]) -> Group[Result]:
    return Group(count=len(rows), results=[result(row) for row in rows[:SHOWN]])


@router.get("/search")
def search(q: SearchText) -> SearchResults:
    with db.reading() as conn:
        rows = _in_order(list(conn.execute(matching(q)).all()), q)
    of_kind = {kind: [row for row in rows if row.kind == kind] for kind in KINDS}
    return SearchResults(
        organizations=_group(
            of_kind["organizations"], lambda row: OrganizationResult(id=row.id, name=row.name, industry=row.detail)
        ),
        contacts=_group(
            of_kind["contacts"], lambda row: ContactResult(id=row.id, name=row.name, organization_name=row.detail)
        ),
        deals=_group(
            of_kind["deals"],
            lambda row: DealResult(id=row.id, name=row.name, stage=row.stage, organization_name=row.detail),
        ),
        products=_group(
            of_kind["products"], lambda row: ProductResult(id=row.id, name=row.name, unit_price_cents=row.price)
        ),
    )
