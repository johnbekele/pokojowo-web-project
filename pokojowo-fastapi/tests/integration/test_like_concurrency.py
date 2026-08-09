"""Integration coverage for the mutual-like event sequence.

The service calls are deliberately started together: this models two users
pressing Like at nearly the same time while the database remains the source
of truth for the resulting pair of likes and match.
"""
import asyncio
from unittest.mock import AsyncMock

import pytest

from app.models.like import Like
from app.models.mutual_match import MutualMatch
from app.services.likes_service import likes_service


pytestmark = pytest.mark.integration


@pytest.mark.xfail(
    reason="Known check-then-insert race tracked by #134; keep the regression visible",
    strict=False,
)
async def test_simultaneous_reciprocal_likes_create_one_mutual_match(
    make_user, monkeypatch
):
    first = await make_user(username="concurrent-first")
    second = await make_user(username="concurrent-second")

    # Notification delivery is outside the persistence contract under test.
    monkeypatch.setattr(likes_service, "_notify_new_like", AsyncMock())
    monkeypatch.setattr(likes_service, "_notify_mutual_match", AsyncMock())

    results = await asyncio.gather(
        likes_service.like_user(str(first.id), str(second.id)),
        likes_service.like_user(str(second.id), str(first.id)),
    )

    assert [result["status"] for result in results] == ["liked", "liked"]
    assert await Like.find({}).count() == 2
    assert await MutualMatch.find({}).count() == 1
