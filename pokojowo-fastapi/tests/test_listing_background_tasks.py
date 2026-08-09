import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.api.v1.endpoints import listings
from app.services import saved_search_service


@pytest.mark.asyncio
async def test_saved_search_task_logs_listing_id_when_fanout_fails(caplog, monkeypatch):
    notify = AsyncMock(side_effect=RuntimeError("notification provider unavailable"))
    monkeypatch.setattr(saved_search_service, "notify_matching_saved_searches", notify)

    with caplog.at_level(logging.ERROR, logger="app.api.v1.endpoints.listings"):
        await listings._run_saved_search_notifications(SimpleNamespace(id="listing-123"))

    notify.assert_awaited_once()
    assert "listing-123" in caplog.text
    assert "notification provider unavailable" in caplog.text


@pytest.mark.asyncio
async def test_geocoding_task_logs_listing_id_when_no_coordinates_are_found(caplog, monkeypatch):
    resolve = AsyncMock(return_value=False)
    monkeypatch.setattr(listings, "resolve_listing_geo_by_id", resolve)

    with caplog.at_level(logging.WARNING, logger="app.api.v1.endpoints.listings"):
        await listings._run_listing_geocoding("listing-456")

    resolve.assert_awaited_once_with("listing-456")
    assert "listing-456" in caplog.text
    assert "no coordinates" in caplog.text
