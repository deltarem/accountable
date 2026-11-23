"""Request models with the field rules from the spec's data model (API-17, ARC-11).

The messages match the frontend's zod schemas word for word, and both are
checked against shared/validation-cases.json.
"""

import re
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

STAGE_KEYS = ("new", "qualified", "proposal", "negotiation", "won", "lost")
STATUS_KEYS = ("lead", "qualified", "customer")
ACTIVITY_TYPES = ("note", "call", "email")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
SCHEME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://")

MSG = {
    "name": "Enter a name",
    "name_long": "Use 200 characters or fewer",
    "text_long": "Use 5.000 characters or fewer",
    "short_long": "Use 200 characters or fewer",
    "email": "Enter an email like name@company.com",
    "organization": "Choose an organization",
    "status": "Choose lead, qualified or customer",
    "stage": "Choose a stage",
    "value": "Value can't be negative",
    "value_type": "Enter an amount like 12.500,00",
    "probability": "Probability must be between 0 and 100",
    "type": "Choose note, call or email",
    "description": "Describe what happened",
    "occurred_at": "Enter when it happened",
    "record": "Choose a contact or a deal",
    "date": "Enter a valid date",
    "index": "Enter a place of 0 or more",
}


def fail(key: str):
    return PydanticCustomError("rule", MSG[key])


def _text(value: Any, max_len: int, long_key: str, required_key: str | None) -> str | None:
    if value is None:
        if required_key:
            raise fail(required_key)
        return None
    if not isinstance(value, str):
        raise fail(required_key or long_key)
    value = value.strip()
    if not value:
        if required_key:
            raise fail(required_key)
        return None
    if len(value) > max_len:
        raise fail(long_key)
    return value


def _optional_id(value: Any) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise PydanticCustomError("rule", "Choose from the list")
    return value


def normalize_website(value: str | None) -> str | None:
    if value and not SCHEME_RE.match(value):
        return "https://" + value
    return value


class _In(BaseModel):
    model_config = ConfigDict(extra="ignore")


class OrganizationIn(_In):
    name: str | None = Field(default=None, validate_default=True)
    website: str | None = None
    industry: str | None = None
    notes: str | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, v):
        return _text(v, 200, "name_long", "name")

    @field_validator("website", mode="before")
    @classmethod
    def _website(cls, v):
        return normalize_website(_text(v, 500, "short_long", None))

    @field_validator("industry", mode="before")
    @classmethod
    def _industry(cls, v):
        return _text(v, 200, "short_long", None)

    @field_validator("notes", mode="before")
    @classmethod
    def _notes(cls, v):
        return _text(v, 5000, "text_long", None)


class ContactIn(_In):
    name: str | None = Field(default=None, validate_default=True)
    email: str | None = None
    phone: str | None = None
    job_title: str | None = None
    organization_id: int | None = None
    status: str = "lead"

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, v):
        return _text(v, 200, "name_long", "name")

    @field_validator("email", mode="before")
    @classmethod
    def _email(cls, v):
        v = _text(v, 320, "email", None)
        if v is not None and not EMAIL_RE.match(v):
            raise fail("email")
        return v

    @field_validator("phone", "job_title", mode="before")
    @classmethod
    def _short(cls, v):
        return _text(v, 200, "short_long", None)

    @field_validator("organization_id", mode="before")
    @classmethod
    def _org(cls, v):
        return _optional_id(v)

    @field_validator("status", mode="before")
    @classmethod
    def _status(cls, v):
        if v is None or v == "":
            return "lead"
        if v not in STATUS_KEYS:
            raise fail("status")
        return v


def _probability(v):
    if v is None or v == "":
        return None
    if isinstance(v, bool) or not isinstance(v, int):
        raise fail("probability")
    if v < 0 or v > 100:
        raise fail("probability")
    return v


def _stage(v, default: str | None = "new"):
    if v is None or v == "":
        if default is None:
            raise fail("stage")
        return default
    if v not in STAGE_KEYS:
        raise fail("stage")
    return v


class DealIn(_In):
    name: str | None = Field(default=None, validate_default=True)
    organization_id: int | None = Field(default=None, validate_default=True)
    contact_id: int | None = None
    stage: str = "new"
    value_cents: int = 0
    probability: int | None = None
    close_date: date | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, v):
        return _text(v, 200, "name_long", "name")

    @field_validator("organization_id", mode="before")
    @classmethod
    def _org(cls, v):
        if v is None or v == "":
            raise fail("organization")
        return _optional_id(v)

    @field_validator("contact_id", mode="before")
    @classmethod
    def _contact(cls, v):
        return _optional_id(v)

    @field_validator("stage", mode="before")
    @classmethod
    def _stage(cls, v):
        return _stage(v)

    @field_validator("value_cents", mode="before")
    @classmethod
    def _value(cls, v):
        if v is None or v == "":
            return 0
        if isinstance(v, bool) or not isinstance(v, int):
            raise fail("value_type")
        if v < 0:
            raise fail("value")
        return v

    @field_validator("probability", mode="before")
    @classmethod
    def _prob(cls, v):
        return _probability(v)

    @field_validator("close_date", mode="before")
    @classmethod
    def _date(cls, v):
        return v or None


class DealMove(_In):
    stage: str | None = Field(default=None, validate_default=True)
    index: int = 0

    @field_validator("stage", mode="before")
    @classmethod
    def _stage(cls, v):
        return _stage(v, default=None)

    @field_validator("index", mode="before")
    @classmethod
    def _index(cls, v):
        if v is None:
            return 0
        if isinstance(v, bool) or not isinstance(v, int) or v < 0:
            raise fail("index")
        return v


class ActivityIn(_In):
    type: str | None = Field(default=None, validate_default=True)
    contact_id: int | None = None
    deal_id: int | None = None
    description: str | None = Field(default=None, validate_default=True)
    occurred_at: datetime | None = Field(default=None, validate_default=True)
    follow_up_date: date | None = None
    follow_up_done: bool = False

    @field_validator("type", mode="before")
    @classmethod
    def _type(cls, v):
        if v not in ACTIVITY_TYPES:
            raise fail("type")
        return v

    @field_validator("contact_id", "deal_id", mode="before")
    @classmethod
    def _ids(cls, v):
        return _optional_id(v)

    @field_validator("description", mode="before")
    @classmethod
    def _description(cls, v):
        return _text(v, 5000, "text_long", "description")

    @field_validator("occurred_at", mode="before")
    @classmethod
    def _occurred(cls, v):
        if v is None or v == "":
            raise fail("occurred_at")
        return v

    @field_validator("occurred_at", mode="after")
    @classmethod
    def _occurred_plain(cls, v):
        # Stored as local time without a zone, to the second.
        return v.replace(tzinfo=None, microsecond=0) if v else v

    @field_validator("follow_up_date", mode="before")
    @classmethod
    def _follow(cls, v):
        return v or None

    @field_validator("follow_up_done", mode="before")
    @classmethod
    def _done(cls, v):
        return bool(v) if v is not None else False

    @model_validator(mode="after")
    def _one_record(self):
        if (self.contact_id is None) == (self.deal_id is None):
            raise PydanticCustomError("record", MSG["record"])
        return self


class DoneIn(_In):
    done: bool


# Fallback messages for errors Pydantic raises itself (wrong types, bad dates).
FIELD_FALLBACK = {
    "close_date": MSG["date"],
    "follow_up_date": MSG["date"],
    "occurred_at": MSG["occurred_at"],
    "value_cents": MSG["value_type"],
    "probability": MSG["probability"],
}


def errors_by_field(errors) -> dict[str, str]:
    """Turn Pydantic's error list into one message per field."""
    out: dict[str, str] = {}
    for err in errors:
        loc = [p for p in err.get("loc", ()) if p != "body"]
        if err.get("type") == "record":
            field = "record"
        elif loc and isinstance(loc[0], str):
            field = loc[0]
        else:
            field = "body"
        if err.get("type") in ("rule", "record"):
            message = err["msg"]
        else:
            message = FIELD_FALLBACK.get(field, "Check this value")
        out.setdefault(field, message)
    return out
