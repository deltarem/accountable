"""Sign-in tokens for the tests, signed by keys the tests make for themselves (ARC-14).

The backend checks tokens against the keys at SUPABASE_URL. conftest.py points
that at TEST_SUPABASE_URL and hands the backend `published_keys()` in place of a
download, so no test reaches the internet.
"""

from dataclasses import dataclass
from functools import cache

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.algorithms import ECAlgorithm

from backend import clock

TEST_SUPABASE_URL = "https://test-project.supabase.invalid"
ISSUER = f"{TEST_SUPABASE_URL}/auth/v1"
KID = "test-key-1"


@cache
def signing_key(kid: str = KID) -> ec.EllipticCurvePrivateKey:
    """One key per key id, made once per run because it's the slow part."""
    return ec.generate_private_key(ec.SECP256R1())


def public_jwk(kid: str = KID) -> dict:
    jwk = ECAlgorithm.to_jwk(signing_key(kid).public_key(), as_dict=True)
    return {**jwk, "kid": kid, "alg": "ES256", "use": "sig"}


def published_keys(*kids: str) -> dict:
    """The JSON Supabase publishes at /auth/v1/.well-known/jwks.json."""
    return {"keys": [public_jwk(k) for k in (kids or (KID,))]}


@dataclass(frozen=True)
class Person:
    sub: str
    email: str
    name: str | None


PRIYA = Person("user-priya", "priya@company.com", "Priya Shah")
SAM = Person("user-sam", "sam@company.com", "Sam Lee")


def make_token(
    person: Person = PRIYA,
    *,
    kid: str = KID,
    key: ec.EllipticCurvePrivateKey | None = None,
    expires_in: int = 3600,
    **claims: str,
) -> str:
    """A token like Supabase's, for that person. `claims` override any claim."""
    now = clock.epoch_seconds()
    body = {
        "sub": person.sub,
        "email": person.email,
        "user_metadata": {"display_name": person.name} if person.name else {},
        "aud": "authenticated",
        "iss": ISSUER,
        "iat": now,
        "exp": now + expires_in,
        "role": "authenticated",
        **claims,
    }
    return jwt.encode(body, key or signing_key(kid), algorithm="ES256", headers={"kid": kid})


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
