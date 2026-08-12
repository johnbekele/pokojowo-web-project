"""Regression tests for verified listing mutations and blocked matching."""

from inspect import signature
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import listings, matching
from app.core.blocking import is_blocked_between
from app.core.dependencies import require_verified
from app.models.user import ChatSettingsModel, User


def _dependency(callable_, name: str):
    return signature(callable_).parameters[name].default.dependency


def test_listing_mutations_require_verified_users():
    """Both mutation routes use the same guard as listing creation."""
    assert _dependency(listings.update_listing, "current_user") is require_verified
    assert _dependency(listings.delete_listing, "current_user") is require_verified


@pytest.mark.asyncio
async def test_unverified_user_is_rejected_by_listing_guard():
    user = User.model_construct(id="user-1", is_verified=False)

    with pytest.raises(HTTPException) as exc_info:
        await require_verified(user)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "EMAIL_NOT_VERIFIED"


@pytest.mark.asyncio
async def test_blocked_match_detail_looks_like_missing_user(monkeypatch):
    current = User.model_construct(
        id="current-user",
        chat_settings=ChatSettingsModel(blocked_users=["target-user"]),
    )
    candidate = User.model_construct(id="target-user")
    find_matches = AsyncMock()
    monkeypatch.setattr(matching.User, "get", AsyncMock(return_value=candidate))
    monkeypatch.setattr(matching.matching_service, "find_matches", find_matches)

    with pytest.raises(HTTPException) as exc_info:
        await matching.get_match_with_user("target-user", current)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"
    find_matches.assert_not_awaited()


@pytest.mark.asyncio
async def test_verified_owner_can_still_update_listing(monkeypatch):
    owner = User.model_construct(id="owner", is_verified=True)
    listing = SimpleNamespace(
        id="listing-1",
        owner_id="owner",
        location_geo={"type": "Point", "coordinates": [21.0, 52.0]},
        geo_precision="exact",
        updated_at=None,
        save=AsyncMock(),
    )
    monkeypatch.setattr(listings.Listing, "get", AsyncMock(return_value=listing))

    payload = listings.ListingUpdate(address="ul. Nowa")
    background_tasks = SimpleNamespace(add_task=lambda *args: None)
    result = await listings.update_listing(
        "listing-1", payload, background_tasks, owner
    )

    assert result["message"] == "Listing updated successfully"
    assert listing.address == "ul. Nowa"
    listing.save.assert_awaited_once()


def test_block_helper_checks_both_directions():
    blocker = User.model_construct(
        id="blocker", chat_settings=ChatSettingsModel(blocked_users=["blocked"])
    )
    blocked = User.model_construct(id="blocked", chat_settings=None)

    assert is_blocked_between(blocker, blocked)
    assert is_blocked_between(blocked, blocker)
