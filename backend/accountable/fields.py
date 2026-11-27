"""What every area's requests and replies share: the base for what a form sends, text a
database can store, blank text, email addresses and times in UTC.
"""

import re
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import Depends
from pydantic import AfterValidator, BaseModel, ConfigDict, PlainSerializer, field_validator

from accountable import db

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
EMAIL_MESSAGE = "Enter a valid email address"


def blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip() or None


def email(value: str | None) -> str | None:
    value = blank_to_none(value)
    if value is not None and not EMAIL.match(value):
        raise ValueError(EMAIL_MESSAGE)
    return value


def with_z(value: datetime) -> str:
    """SQLite stores no zone, so without this the browser would read UTC as local."""
    return value.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z")


def is_storable(text: str) -> bool:
    """JSON can carry text a database can't store, which would crash the save: a
    character with no valid encoding, or a NUL, which Postgres refuses in text."""
    if "\x00" in text:
        return False
    if text.isascii():
        return True
    try:
        text.encode()
    except UnicodeEncodeError:
        return False
    return True


OptionalText = Annotated[str | None, AfterValidator(blank_to_none)]
Email = Annotated[str | None, AfterValidator(email)]
UtcTime = Annotated[datetime, PlainSerializer(with_z, return_type=str)]
# Asked for per request, so tests can fix it.
Now = Annotated[datetime, Depends(db.utc_now)]


class Request(BaseModel):
    """What a form sends. In an update, MISSING marks a field that wasn't sent, which keeps its value.

    Who added or changed a record comes from the token, so a body naming someone
    has it ignored, like any other field a form doesn't send.
    """

    model_config = ConfigDict(extra="ignore")

    @field_validator("*")
    @classmethod
    def _storable(cls, value: Any) -> Any:
        if isinstance(value, str) and not is_storable(value):
            raise ValueError("Use plain text here")
        return value
