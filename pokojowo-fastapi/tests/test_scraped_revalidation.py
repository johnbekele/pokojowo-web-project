from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.api.v1.endpoints.listings import (
    ScrapedListingRevalidation,
    build_listing_query,
    listing_to_dict,
    revalidate_scraped_listing,
)
from app.core.config import settings


class FakeListing:
    id = ObjectId()
    is_scraped = True
    source_last_verified_at = None
    source_unpublished_at = None
    is_active = True
    source_status = "active"
    updated_at = None

    def __init__(self):
        self.saved = 0

    async def save(self):
        self.saved += 1


@pytest.mark.asyncio
async def test_revalidation_requires_scraper_key(monkeypatch):
    monkeypatch.setattr(settings, "SCRAPER_API_KEY", "secret")
    check = ScrapedListingRevalidation(
        sourceUrl="https://example.test/listing",
        available=True,
        checkedAt=datetime.now(timezone.utc),
    )

    with pytest.raises(HTTPException) as exc:
        await revalidate_scraped_listing(check, x_scraper_key="wrong")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_two_failures_unpublish_and_success_restores(monkeypatch):
    fake = FakeListing()
    monkeypatch.setattr(settings, "SCRAPER_API_KEY", "secret")
    monkeypatch.setattr(
        "app.api.v1.endpoints.listings.Listing.find_one",
        classmethod(lambda cls, _query: _awaitable(fake)),
    )

    async def check(available, failures):
        return await revalidate_scraped_listing(
            ScrapedListingRevalidation(
                sourceUrl="https://example.test/listing",
                available=available,
                checkedAt=datetime.now(timezone.utc),
                consecutiveFailures=failures,
                reason="test",
            ),
            x_scraper_key="secret",
        )

    first = await check(False, 1)
    assert first["unpublished"] is False
    assert fake.source_status == "unverified"
    second = await check(False, 2)
    assert second["unpublished"] is True
    assert fake.is_active is False
    assert fake.source_status == "unavailable"
    restored = await check(True, 0)
    assert restored["unpublished"] is False
    assert fake.is_active is True
    assert fake.source_status == "active"
    assert fake.saved == 3


def test_public_listing_query_excludes_explicitly_unpublished_sources():
    query = build_listing_query(city="Warszawa")
    assert query["isActive"] == {"$ne": False}


def test_listing_response_exposes_source_verification_fields():
    listing = SimpleNamespace(
        id=ObjectId(),
        owner_id="scraped",
        address="Warszawa",
        city="Warszawa",
        district=None,
        location_geo=None,
        geo_precision=None,
        price=2000,
        size=20,
        max_tenants=1,
        images=[],
        description={"en": "", "pl": ""},
        phone=None,
        available_from=None,
        room_type=None,
        building_type=None,
        rent_for_only=[],
        can_be_contacted=[],
        close_to=[],
        ai_help=False,
        offered_by=None,
        is_scraped=True,
        source_url="https://example.test/listing",
        source_site="otodom",
        is_active=True,
        source_status="active",
        source_last_verified_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        source_unpublished_at=None,
        created_at=None,
        updated_at=None,
    )
    result = listing_to_dict(listing)
    assert result["sourceStatus"] == "active"
    assert result["sourceLastVerifiedAt"].year == 2026


async def _awaitable(value):
    return value
