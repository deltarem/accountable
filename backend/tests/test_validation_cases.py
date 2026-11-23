"""Every case in shared/validation-cases.json passes or fails in Pydantic as listed (ARC-11)."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.schemas import ActivityIn, ContactIn, DealIn, OrganizationIn, errors_by_field

CASES = json.loads(
    (Path(__file__).parents[2] / "shared" / "validation-cases.json").read_text(encoding="utf-8")
)
MODELS = {
    "organization": OrganizationIn,
    "contact": ContactIn,
    "deal": DealIn,
    "activity": ActivityIn,
}


def expand(value):
    if isinstance(value, dict) and "repeat" in value:
        return value["repeat"] * value["times"]
    return value


def all_cases():
    for form, spec in CASES["forms"].items():
        for i, case in enumerate(spec["cases"]):
            yield pytest.param(
                form, spec["base"], case, id=f"{form}-{i}-{json.dumps(case['set'])[:40]}"
            )


@pytest.mark.parametrize("form,base,case", list(all_cases()))
def test_case(form, base, case):
    body = {**base, **{k: expand(v) for k, v in case["set"].items()}}
    model = MODELS[form]
    if case["valid"]:
        model.model_validate(body)
    else:
        with pytest.raises(ValidationError) as info:
            model.model_validate(body)
        errors = errors_by_field(info.value.errors())
        assert errors.get(case["field"]) == case["message"], errors
