"""The company settings: the team's one set of business details for its documents (B1 to B13).

Every area that makes documents will need them, so they sit at the top level, beside users.
"""

import re
from collections.abc import Mapping
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException
from pydantic import MISSING, BaseModel, BeforeValidator
from sqlalchemy import CheckConstraint, Column, Connection, DateTime, ForeignKey, Integer, Table, Text, column, select
from sqlalchemy import update as update_rows

from accountable import db
from accountable.auth import CurrentUser
from accountable.fields import EMAIL_MESSAGE, Now, OptionalText, Request, UtcTime, blank_to_none, email
from accountable.users import Person, person, users

company_settings = Table(
    "company_settings",
    db.metadata,
    Column("id", Integer, primary_key=True),
    Column("company_name", Text, nullable=False),
    Column("address", Text),
    Column("email", Text),
    Column("phone", Text),
    Column("tax_label", Text),
    Column("tax_rate", Integer, nullable=False),  # thousandths of a percent, so 8.875% is 8875
    Column("payment_terms_days", Integer, nullable=False),
    Column("quote_prefix", Text, nullable=False),
    Column("invoice_prefix", Text, nullable=False),
    Column("created_at", DateTime, nullable=False, default=db.utc_now),
    Column("updated_at", DateTime, nullable=False, default=db.utc_now),
    Column("updated_by", ForeignKey(users.c.id), index=True),  # blank until someone changes them (B7)
    CheckConstraint(column("id") == 1, name="one_row"),
    **db.TABLE_OPTIONS,
)

THE_ROW = 1

COMPANY_NAME_MESSAGE = "Enter the company name"
TAX_RATE_MESSAGE = "Enter a percentage from 0 to 100, with up to 3 decimal places"
PAYMENT_TERMS_MESSAGE = "Enter a whole number of days from 0 to 365"
MAX_PAYMENT_TERMS = 365

# ASCII only, since \d would otherwise also match digits from other scripts.
TAX_RATE = re.compile(r"^(\d+(\.\d{0,3})?|\.\d{1,3})$", re.ASCII)
PREFIX = re.compile(r"^[A-Za-z0-9-]{1,10}$", re.ASCII)


def prefix_message(example: str) -> str:
    return f"Use 1 to 10 letters, digits or hyphens, such as {example}"


# Each check runs before Pydantic's own, so a wrong type or a null gets the field's
# message rather than "Check this field".


def _company_name(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(COMPANY_NAME_MESSAGE)
    return value.strip()


def _email(value: Any) -> str | None:
    if value is not None and not isinstance(value, str):
        raise ValueError(EMAIL_MESSAGE)
    return email(value)


def _address(value: Any) -> Any:
    # Line breaks inside stay. Spaces and blank lines at the ends go, as strip does.
    return blank_to_none(value) if isinstance(value, str) else value


def tax_rate_thousandths(value: Any) -> int:
    """The rate as typed, such as "8.875", as thousandths of a percent, worked out exactly."""
    text = value.strip() if isinstance(value, str) else None
    if not text or not TAX_RATE.match(text):
        raise ValueError(TAX_RATE_MESSAGE)
    rate = Decimal(text)
    if rate > 100:
        raise ValueError(TAX_RATE_MESSAGE)
    return int(rate * 1000)


def tax_rate_text(thousandths: int) -> str:
    """8875 as "8.875", 8500 as "8.5" and 20000 as "20"."""
    whole, part = divmod(thousandths, 1000)
    return f"{whole}.{part:03d}".rstrip("0") if part else str(whole)


def _payment_terms(value: Any) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= MAX_PAYMENT_TERMS:
        raise ValueError(PAYMENT_TERMS_MESSAGE)
    return value


def _prefix(example: str) -> BeforeValidator:
    def check(value: Any) -> str:
        text = value.strip() if isinstance(value, str) else ""
        if not PREFIX.match(text):
            raise ValueError(prefix_message(example))
        return text

    return BeforeValidator(check)


CompanyName = Annotated[str, BeforeValidator(_company_name)]
Address = Annotated[str | None, BeforeValidator(_address)]
CompanyEmail = Annotated[str | None, BeforeValidator(_email)]
# Sent and replied as text, such as "8.875", so no rate passes through a floating-point number.
TaxRate = Annotated[int, BeforeValidator(tax_rate_thousandths, json_schema_input_type=str)]
PaymentTerms = Annotated[int, BeforeValidator(_payment_terms)]
QuotePrefix = Annotated[str, _prefix("QT-")]
InvoicePrefix = Annotated[str, _prefix("INV-")]


class SettingsUpdate(Request):
    """Only the fields sent change, so two people changing different fields both keep their change (B8)."""

    company_name: CompanyName | MISSING = MISSING
    address: Address = None
    email: CompanyEmail = None
    phone: OptionalText = None
    tax_label: OptionalText = None
    tax_rate: TaxRate | MISSING = MISSING
    payment_terms_days: PaymentTerms | MISSING = MISSING
    quote_prefix: QuotePrefix | MISSING = MISSING
    invoice_prefix: InvoicePrefix | MISSING = MISSING


class CompanySettings(BaseModel):
    company_name: str
    address: str | None
    email: str | None
    phone: str | None
    tax_label: str | None
    tax_rate: str
    payment_terms_days: int
    quote_prefix: str
    invoice_prefix: str
    updated_at: UtcTime
    updated_by: Person | None


_changed_by = users.alias("changed_by")
_with_name = (
    select(company_settings, _changed_by.c.name.label("changed_by_name"), _changed_by.c.email.label("changed_by_email"))
    .outerjoin(_changed_by, company_settings.c.updated_by == _changed_by.c.id)
    .where(company_settings.c.id == THE_ROW)
)


def _read(conn: Connection) -> Any:
    row = conn.execute(_with_name).one_or_none()
    if row is None:
        # Only a hand-made delete, such as in Supabase's SQL editor, can do this.
        raise HTTPException(500, "The company settings are missing.")
    return row


def _reply(row: Any) -> CompanySettings:
    return CompanySettings(
        company_name=row.company_name,
        address=row.address,
        email=row.email,
        phone=row.phone,
        tax_label=row.tax_label,
        tax_rate=tax_rate_text(row.tax_rate),
        payment_terms_days=row.payment_terms_days,
        quote_prefix=row.quote_prefix,
        invoice_prefix=row.invoice_prefix,
        updated_at=row.updated_at,
        updated_by=person(row.updated_by, row.changed_by_name, row.changed_by_email),
    )


def replace(conn: Connection, values: Mapping[str, Any], user_id: str | None, now: datetime) -> None:
    """Writes stored values over the settings, as the sample data does, recording who and when."""
    conn.execute(
        update_rows(company_settings)
        .where(company_settings.c.id == THE_ROW)
        .values(**values, updated_by=user_id, updated_at=now)
    )


router = APIRouter()


@router.get("/settings")
def get_settings() -> CompanySettings:
    with db.reading() as conn:
        return _reply(_read(conn))


@router.patch("/settings")
def edit_settings(body: SettingsUpdate, user: CurrentUser, now: Now) -> CompanySettings:
    sent = body.model_dump(exclude_unset=True)
    with db.writing() as conn:
        current = _read(conn)
        # A save that alters nothing isn't a change, so it leaves who and when alone (B7).
        altered = {name: value for name, value in sent.items() if getattr(current, name) != value}
        if altered:
            replace(conn, altered, user, now)
        return _reply(_read(conn))
