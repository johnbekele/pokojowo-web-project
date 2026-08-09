from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import listing_interactions
from app.models.user import User


STATS = {
    "totalViews": 12,
    "uniqueViewers": 8,
    "totalLikes": 3,
    "totalInquiries": 1,
}


def user(*, user_id: str, roles: list[str]) -> User:
    """Build only the fields the stats authorization check needs."""
    return User.model_construct(id=user_id, role=roles)


@pytest.mark.asyncio
async def test_listing_owner_can_read_stats():
    listing = SimpleNamespace(owner_id="owner")
    with (
        patch.object(listing_interactions.Listing, "get", new=AsyncMock(return_value=listing)),
        patch.object(
            listing_interactions.listing_interaction_service,
            "get_listing_stats",
            new=AsyncMock(return_value=STATS),
        ),
    ):
        response = await listing_interactions.get_listing_stats(
            "listing-id", user(user_id="owner", roles=[])
        )

    assert response.total_views == STATS["totalViews"]


@pytest.mark.asyncio
async def test_admin_can_read_stats_even_when_roles_are_strings():
    listing = SimpleNamespace(owner_id="another-user")
    with (
        patch.object(listing_interactions.Listing, "get", new=AsyncMock(return_value=listing)),
        patch.object(
            listing_interactions.listing_interaction_service,
            "get_listing_stats",
            new=AsyncMock(return_value=STATS),
        ),
    ):
        response = await listing_interactions.get_listing_stats(
            "listing-id", user(user_id="admin", roles=["Admin"])
        )

    assert response.total_likes == STATS["totalLikes"]


@pytest.mark.asyncio
async def test_non_owner_non_admin_is_forbidden():
    listing = SimpleNamespace(owner_id="owner")
    stats = AsyncMock(return_value=STATS)
    with patch.object(
        listing_interactions.Listing, "get", new=AsyncMock(return_value=listing)
    ), patch.object(
        listing_interactions.listing_interaction_service,
        "get_listing_stats",
        new=stats,
    ):
        with pytest.raises(HTTPException) as exc_info:
            await listing_interactions.get_listing_stats(
                "listing-id", user(user_id="visitor", roles=["User"])
            )

    assert exc_info.value.status_code == 403
    stats.assert_not_awaited()
