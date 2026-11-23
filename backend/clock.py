"""The only place that reads the current date and time (ARC-12).

ACCOUNTABLE_TODAY fixes the date, for example "2026-11-23". It may also carry
a time, "2026-11-23T14:00:00", which fixes the clock completely (used by tests).
"""

import os
from datetime import date, datetime


def _fixed() -> str | None:
    value = os.environ.get("ACCOUNTABLE_TODAY", "").strip()
    return value or None


def now() -> datetime:
    fixed = _fixed()
    real = datetime.now().replace(microsecond=0)
    if fixed is None:
        return real
    if "T" in fixed:
        return datetime.fromisoformat(fixed).replace(microsecond=0)
    return datetime.combine(date.fromisoformat(fixed), real.time())


def today() -> date:
    return now().date()
