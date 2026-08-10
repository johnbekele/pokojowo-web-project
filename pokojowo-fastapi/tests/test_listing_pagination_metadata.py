from types import SimpleNamespace

import pytest

from app.api.v1.endpoints import listings


class FakeFinder:
    def __init__(self, values, total):
        self.values = values
        self.total = total

    def sort(self, *_args):
        return self

    def skip(self, *_args):
        return self

    def limit(self, *_args):
        return self

    async def to_list(self):
        return self.values

    async def count(self):
        return self.total


def fake_listing(identifier):
    return SimpleNamespace(
        id=identifier,
        owner_id='owner-1',
        address='ul. Testowa 1',
        city='Warsaw',
        district='Mokotów',
        location_geo=None,
        geo_precision=None,
        price=2500,
        size=20,
        max_tenants=1,
        images=[],
        description={'en': 'Room', 'pl': 'Pokój'},
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
        source_url='https://example.test/listing',
        source_site='example',
        is_active=True,
        source_status='active',
        source_last_verified_at=None,
        source_unpublished_at=None,
        created_at=None,
        updated_at=None,
    )


@pytest.mark.asyncio
async def test_listing_metadata_reports_total_and_has_more(monkeypatch):
    values = [fake_listing('listing-1'), fake_listing('listing-2')]

    class FakeListing:
        @classmethod
        def find(cls, _query):
            return FakeFinder(values, total=5)

    monkeypatch.setattr(listings, 'Listing', FakeListing)

    page = await listings.get_listings(
        skip=0,
        limit=2,
        search=None,
        sort='newest',
        min_price=None,
        max_price=None,
        min_size=None,
        max_size=None,
        room_type=None,
        building_type=None,
        rent_for=None,
        max_tenants=None,
        city=None,
        district=None,
        offered_by=None,
        with_meta=True,
        bbox=None,
    )

    assert page.listings[0]['_id'] == 'listing-1'
    assert page.total == 5
    assert page.skip == 0
    assert page.limit == 2
    assert page.hasMore is True


@pytest.mark.asyncio
async def test_listing_metadata_marks_last_page(monkeypatch):
    values = [fake_listing('listing-5')]

    class FakeListing:
        @classmethod
        def find(cls, _query):
            return FakeFinder(values, total=5)

    monkeypatch.setattr(listings, 'Listing', FakeListing)

    page = await listings.get_listings(
        skip=4,
        limit=2,
        search=None,
        sort='newest',
        min_price=None,
        max_price=None,
        min_size=None,
        max_size=None,
        room_type=None,
        building_type=None,
        rent_for=None,
        max_tenants=None,
        city=None,
        district=None,
        offered_by=None,
        with_meta=True,
        bbox=None,
    )

    assert page.total == 5
    assert page.hasMore is False
