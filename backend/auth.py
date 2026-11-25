"""Who is signed in (AUTH-01, AUTH-02, ARC-19).

`current_user` is the one FastAPI dependency that checks the sign-in token. The
`/api` router applies it to every route, and routes that need the user's id take
it again (FastAPI runs it once per request). The user comes from the token and
nowhere else.

- With Supabase, the token's signature is checked against the public keys the
  project publishes, kept in memory and fetched again when a token names a key
  the backend doesn't have. Supabase isn't asked about each request.
- In local mode (DEC-19), the only accepted token is one from the built-in test
  user's sign-in, signed with a key that is public on purpose: local mode only
  runs on SQLite and is off unless a script turns it on.

Each request also keeps the `users` table up to date (DEC-18), writing only when
the id, email or name differ from what this process last saw.
"""

import logging
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError

from backend import clock, db, settings
from backend.db import users

log = logging.getLogger("accountable")

SIGN_IN = "Sign in to continue"
AUDIENCE = "authenticated"

# The built-in test user (DEC-19). All of this is public, by design.
LOCAL_USER_ID = "local-test-user"
LOCAL_EMAIL = "test@example.com"
LOCAL_PASSWORD = "accountable"
LOCAL_NAME = "Test User"
LOCAL_ISSUER = "accountable-local"
LOCAL_SIGNING_KEY = "accountable-local-mode-public-signing-key"  # gitleaks:allow
LOCAL_TOKEN_DAYS = 30

# Seconds before an unknown key id may make the backend fetch the keys again, so a
# stream of made-up key ids can't turn into a stream of requests to Supabase.
KEY_REFRESH_COOLDOWN = 30


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str
    name: str

    @property
    def initials(self) -> str:
        return initials(self.name)


def display_name(email: str, metadata: dict | None) -> str:
    """DEC-18: the display name set in Supabase's dashboard, or the part of the email
    before the @. Supabase keeps it in the token's user_metadata; display_name is the
    dashboard's field, and full_name or name are what other Supabase tools write."""
    metadata = metadata or {}
    for key in ("display_name", "full_name", "name"):
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return email.split("@")[0]


def initials(name: str) -> str:
    """UI-MENU-01: the first letters of the first and last words, or the first two
    letters of a one-word name, in capitals."""
    words = name.split()
    if not words:
        return "?"
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[-1][0]).upper()


def local_token() -> str:
    """API-20: a token for the built-in test user, accepted in local mode only."""
    issued = clock.epoch_seconds()
    claims = {
        "sub": LOCAL_USER_ID,
        "email": LOCAL_EMAIL,
        "user_metadata": {"display_name": LOCAL_NAME},
        "aud": AUDIENCE,
        "iss": LOCAL_ISSUER,
        "iat": issued,
        "exp": issued + LOCAL_TOKEN_DAYS * 24 * 3600,
    }
    return jwt.encode(claims, LOCAL_SIGNING_KEY, algorithm="HS256")


_key_clients: dict[str, jwt.PyJWKClient] = {}


def _key_client(supabase_url: str) -> jwt.PyJWKClient:
    if supabase_url not in _key_clients:
        _key_clients[supabase_url] = jwt.PyJWKClient(
            f"{supabase_url}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
            cooldown_duration=KEY_REFRESH_COOLDOWN,
            timeout=10,
        )
    return _key_clients[supabase_url]


def forget_keys() -> None:
    _key_clients.clear()


def _supabase_claims(token: str, supabase_url: str) -> dict:
    header = jwt.get_unverified_header(token)
    if header.get("alg") == "HS256":
        # Older Supabase projects sign with a shared secret, which the backend
        # doesn't have and shouldn't need (ARC-17).
        log.error(
            "A sign-in token was signed with a shared secret (HS256). Switch the Supabase "
            "project to JWT signing keys (Project Settings > JWT Keys) so tokens can be "
            "checked against its published keys."
        )
        raise jwt.InvalidTokenError("shared-secret token")
    key = _key_client(supabase_url).get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        key,
        algorithms=["ES256", "RS256", "EdDSA"],
        audience=AUDIENCE,
        issuer=f"{supabase_url}/auth/v1",
        options={"require": ["exp", "sub"]},
    )


def _local_claims(token: str) -> dict:
    return jwt.decode(
        token,
        LOCAL_SIGNING_KEY,
        algorithms=["HS256"],
        audience=AUDIENCE,
        issuer=LOCAL_ISSUER,
        options={"require": ["exp", "sub"]},
    )


def user_from_token(token: str) -> CurrentUser:
    """Check the token and return who it belongs to. Raises jwt.InvalidTokenError
    (or PyJWKClientError) for anything that isn't a valid, current token."""
    config = settings.load()
    if config.local:
        claims = _local_claims(token)
    else:
        claims = _supabase_claims(token, config.require_supabase_url())
    email = claims.get("email") or ""
    return CurrentUser(
        id=str(claims["sub"]),
        email=email,
        name=display_name(email, claims.get("user_metadata")),
    )


# What this process last wrote to `users`, per database and user id.
_known: dict[tuple[str, str], tuple[str, str]] = {}


def remember_user(user: CurrentUser) -> None:
    """DEC-18: write the user's email and name into `users` when they changed."""
    database = settings.load().database_url
    if _known.get((database, user.id)) == (user.email, user.name):
        return
    at = clock.now()
    values = {"email": user.email, "name": user.name, "updated_at": at}
    try:
        with db.transaction() as conn:
            row = conn.execute(select(users).where(users.c.id == user.id)).mappings().first()
            if row is None:
                conn.execute(insert(users).values(id=user.id, created_at=at, **values))
            elif (row["email"], row["name"]) != (user.email, user.name):
                conn.execute(update(users).where(users.c.id == user.id).values(**values))
    except IntegrityError:
        # Two first requests from the same person at once: the other one added the
        # row between our read and our insert, with the same details.
        pass
    _known[(database, user.id)] = (user.email, user.name)


def forget_users() -> None:
    _known.clear()


def current_user(authorization: Annotated[str | None, Header()] = None) -> CurrentUser:
    """The FastAPI dependency (ARC-19). 401 with "Sign in to continue" for a missing,
    expired, wrongly signed or tampered token (AUTH-01)."""
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail=SIGN_IN)
    try:
        user = user_from_token(token.strip())
    except jwt.PyJWKClientError as exc:
        log.warning("Couldn't check a sign-in token against Supabase's keys: %s", exc)
        raise HTTPException(status_code=401, detail=SIGN_IN) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=SIGN_IN) from exc
    remember_user(user)
    return user


# What a route asks for to get the signed-in user (ARC-19).
SignedIn = Annotated[CurrentUser, Depends(current_user)]
