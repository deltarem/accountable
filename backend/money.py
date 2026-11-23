"""Money is whole cents; probability is whole percent (ARC-05)."""


def round_half_up_div(numerator: int, denominator: int) -> int:
    """Divide non-negative integers, rounding half up."""
    return (numerator * 2 + denominator) // (denominator * 2)


def expected_cents(value_cents: int, probability: int) -> int:
    return round_half_up_div(value_cents * probability, 100)


def total_expected_cents(deals) -> int:
    """Sum value times probability over deals, rounding only at the end."""
    raw = sum(d["value_cents"] * d["probability"] for d in deals)
    return round_half_up_div(raw, 100)
