"""Tests for the indexed saved-search fan-out candidate query."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.models.saved_search import SavedSearch
from app.services import saved_search_service
from app.services.saved_search_service import saved_search_candidate_query


def _listing(**overrides):
    values = {"price": 2000, "city": "Warszawa"}
    values.update(overrides)
    return SimpleNamespace(**values)


def test_candidate_query_filters_enabled_price_and_city():
    query = saved_search_candidate_query(_listing())

    assert query["$and"][0] == {"notifyEnabled": True}
    assert {"minPrice": {"$lte": 2000}} in query["$and"][1]["$or"]
    assert {"maxPrice": {"$gte": 2000}} in query["$and"][2]["$or"]
    assert {
        "$or": [
            {"city": None},
            {"city": ""},
            {"city": {"$in": ["Warszawa"]}},
            {"city": {"$regex": "^Warszawa$", "$options": "i"}},
        ]
    } in query["$and"]


def test_legacy_listing_without_city_keeps_city_searches_for_python_fallback():
    query = saved_search_candidate_query(_listing(city=None))

    assert not any("city" in clause for clause in query["$and"])


class _Cursor:
    def __init__(self, items):
        self.items = items

    def __aiter__(self):
        async def iterate():
            for item in self.items:
                yield item

        return iterate()

    async def to_list(self):
        raise AssertionError("saved-search fan-out must stream the cursor")


@pytest.mark.asyncio
async def test_fanout_streams_candidates_and_keeps_atomic_claim(monkeypatch):
    query_seen = {}
    search = SimpleNamespace(
        id="search-1",
        user_id="tenant-1",
        name="Warsaw rooms",
        search=None,
        city="Warszawa",
        districts=[],
        min_price=1000,
        max_price=2500,
        min_size=None,
        max_size=None,
        room_types=[],
        building_types=[],
        rent_for=[],
        max_tenants=None,
        offered_by=None,
    )

    def find(candidate_query):
        query_seen["query"] = candidate_query
        return _Cursor([search])

    monkeypatch.setattr(SavedSearch, "find", staticmethod(find))
    claim = AsyncMock(return_value={"_id": "search-1"})
    monkeypatch.setattr(
        SavedSearch,
        "get_motor_collection",
        staticmethod(lambda: SimpleNamespace(find_one_and_update=claim)),
    )
    notify_one = AsyncMock()
    monkeypatch.setattr(saved_search_service, "_notify_one", notify_one)

    listing = SimpleNamespace(
        id="listing-1",
        owner_id="owner-1",
        address="Warszawa, Mokotów",
        city="Warszawa",
        district="Mokotów",
        price=2000,
        size=25,
        max_tenants=1,
        description={"en": "room", "pl": "pokój"},
        close_to=[],
        room_type=None,
        building_type=None,
        rent_for_only=[],
        offered_by=None,
    )

    await saved_search_service.notify_matching_saved_searches(listing)

    assert query_seen["query"] == saved_search_candidate_query(listing)
    claim.assert_awaited_once()
    notify_one.assert_awaited_once_with(listing, search)
