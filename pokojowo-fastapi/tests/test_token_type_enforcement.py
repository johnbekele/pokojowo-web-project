"""Only access tokens may authenticate a request.

Every token this service issues is signed with the same key, so without a check
on the `type` claim a refresh token (valid for days) authenticates API calls
just as well as an access token (valid for minutes).

Driven through asyncio.run rather than pytest-asyncio to match the rest of the
suite, which has no async plugin.
"""
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import dependencies
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    create_verification_token,
)

USER_ID = "507f1f77bcf86cd799439011"


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _authenticate(token: str):
    return asyncio.run(dependencies.get_current_user(_creds(token)))


@pytest.mark.parametrize(
    "token_factory",
    [
        lambda: create_refresh_token({"user_id": USER_ID, "email": "a@example.com"}),
        lambda: create_verification_token("a@example.com"),
        lambda: create_password_reset_token("a@example.com"),
    ],
    ids=["refresh", "verification", "password_reset"],
)
def test_non_access_tokens_are_rejected(token_factory):
    with pytest.raises(HTTPException) as exc_info:
        _authenticate(token_factory())

    assert exc_info.value.status_code == 401


def test_garbage_token_is_rejected():
    with pytest.raises(HTTPException) as exc_info:
        _authenticate("not-a-jwt")

    assert exc_info.value.status_code == 401


def test_access_token_still_authenticates(monkeypatch):
    """Guards against the type check being tightened into a lockout."""
    expected = SimpleNamespace(is_active=True, id=USER_ID)

    async def fake_get(user_id):
        assert user_id == USER_ID
        return expected

    monkeypatch.setattr(dependencies.User, "get", staticmethod(fake_get))

    token = create_access_token({"user_id": USER_ID, "email": "a@example.com"})
    assert _authenticate(token) is expected


def test_inactive_user_is_rejected(monkeypatch):
    async def fake_get(user_id):
        return SimpleNamespace(is_active=False, id=USER_ID)

    monkeypatch.setattr(dependencies.User, "get", staticmethod(fake_get))

    token = create_access_token({"user_id": USER_ID, "email": "a@example.com"})
    with pytest.raises(HTTPException) as exc_info:
        _authenticate(token)

    assert exc_info.value.status_code == 403
