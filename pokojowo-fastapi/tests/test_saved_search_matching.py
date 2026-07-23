"""Unit tests for the pure saved-search matcher.

Objects are built with ``model_construct`` (no Mongo / Beanie init needed),
matching the style in conftest.py. These cover every dimension of
``listing_matches_filters`` — the predicate that mirrors get_listings' Mongo
query so a saved search matches exactly what /discover would return.
"""
from bson import ObjectId

from app.models.listing import (
    Listing,
    RoomTypeEnum,
    BuildingTypeEnum,
    OfferedByEnum,
    RentForEnum,
)
from app.models.saved_search import SavedSearch
from app.services.saved_search_service import listing_matches_filters


def make_listing(
    *,
    address="Kraków, Grzegórzki 12",
    city="Kraków",
    district="Grzegórzki",
    price=2000.0,
    size=45.0,
    max_tenants=2,
    description=None,
    close_to=None,
    room_type=RoomTypeEnum.SINGLE,
    building_type=BuildingTypeEnum.APARTMENT,
    rent_for_only=(RentForEnum.OPEN_TO_ALL,),
    offered_by=OfferedByEnum.OWNER,
    owner_id="owner1",
) -> Listing:
    return Listing.model_construct(
        id=ObjectId(),
        owner_id=owner_id,
        address=address,
        city=city,
        district=district,
        price=price,
        size=size,
        max_tenants=max_tenants,
        images=[],
        description=description or {"en": "Nice flat", "pl": "Ładne mieszkanie"},
        close_to=list(close_to) if close_to is not None else [],
        room_type=room_type,
        building_type=building_type,
        rent_for_only=list(rent_for_only),
        offered_by=offered_by,
    )


def make_search(**kwargs) -> SavedSearch:
    defaults = dict(
        user_id="tenant1",
        name="My search",
        search=None,
        city=None,
        districts=[],
        min_price=None,
        max_price=None,
        min_size=None,
        max_size=None,
        room_types=[],
        building_types=[],
        rent_for=[],
        max_tenants=None,
        offered_by=None,
        notify_enabled=True,
    )
    defaults.update(kwargs)
    return SavedSearch.model_construct(id=ObjectId(), **defaults)


# --- empty filter matches anything --------------------------------------

def test_empty_search_matches_any_listing():
    assert listing_matches_filters(make_listing(), make_search()) is True


# --- free-text search ----------------------------------------------------

def test_search_matches_address_case_insensitive():
    listing = make_listing(address="Warszawa, Mokotów")
    assert listing_matches_filters(listing, make_search(search="mokotów")) is True


def test_search_matches_description_en_and_pl():
    listing = make_listing(description={"en": "cozy studio", "pl": "kawalerka"})
    assert listing_matches_filters(listing, make_search(search="STUDIO")) is True
    assert listing_matches_filters(listing, make_search(search="kawalerka")) is True


def test_search_matches_close_to():
    listing = make_listing(close_to=["AGH University", "Park"])
    assert listing_matches_filters(listing, make_search(search="university")) is True


def test_search_no_match_returns_false():
    listing = make_listing(address="Gdańsk", description={"en": "flat", "pl": "mieszkanie"})
    assert listing_matches_filters(listing, make_search(search="warszawa")) is False


def test_search_handles_none_description_fields():
    listing = make_listing(description={"en": None, "pl": None}, close_to=None)
    # Should not raise on Nones; simply no match.
    assert listing_matches_filters(listing, make_search(search="foo")) is False


# --- price / size boundaries (inclusive) --------------------------------

def test_price_boundary_inclusive():
    listing = make_listing(price=2000.0)
    assert listing_matches_filters(listing, make_search(min_price=2000, max_price=2000)) is True
    assert listing_matches_filters(listing, make_search(min_price=2001)) is False
    assert listing_matches_filters(listing, make_search(max_price=1999)) is False


def test_size_boundary_inclusive():
    listing = make_listing(size=45.0)
    assert listing_matches_filters(listing, make_search(min_size=45, max_size=45)) is True
    assert listing_matches_filters(listing, make_search(min_size=46)) is False
    assert listing_matches_filters(listing, make_search(max_size=44)) is False


# --- room / building types ----------------------------------------------

def test_room_type_membership():
    listing = make_listing(room_type=RoomTypeEnum.DOUBLE)
    assert listing_matches_filters(listing, make_search(room_types=["Double"])) is True
    assert listing_matches_filters(listing, make_search(room_types=["Single"])) is False
    # Empty list = no constraint.
    assert listing_matches_filters(listing, make_search(room_types=[])) is True


def test_building_type_membership():
    listing = make_listing(building_type=BuildingTypeEnum.LOFT)
    assert listing_matches_filters(listing, make_search(building_types=["Loft", "Block"])) is True
    assert listing_matches_filters(listing, make_search(building_types=["Apartment"])) is False


# --- rentFor overlap -----------------------------------------------------

def test_rent_for_overlap_matches():
    listing = make_listing(rent_for_only=(RentForEnum.STUDENT, RentForEnum.WOMEN))
    assert listing_matches_filters(listing, make_search(rent_for=["Student"])) is True


def test_rent_for_disjoint_no_match():
    listing = make_listing(rent_for_only=(RentForEnum.STUDENT,))
    assert listing_matches_filters(listing, make_search(rent_for=["Family", "Couple"])) is False


# --- maxTenants ----------------------------------------------------------

def test_max_tenants_upper_bound():
    listing = make_listing(max_tenants=2)
    assert listing_matches_filters(listing, make_search(max_tenants=2)) is True
    assert listing_matches_filters(listing, make_search(max_tenants=3)) is True
    assert listing_matches_filters(listing, make_search(max_tenants=1)) is False


# --- city: canonical + legacy address fallback --------------------------

def test_city_canonical_equality():
    listing = make_listing(city="Kraków", address="somewhere")
    # English alias should canonicalise to Kraków.
    assert listing_matches_filters(listing, make_search(city="krakow")) is True
    assert listing_matches_filters(listing, make_search(city="Warszawa")) is False


def test_city_legacy_address_fallback():
    # Legacy listing: no structured city, only free-text address.
    listing = make_listing(city=None, address="ul. Długa 5, Kraków")
    assert listing_matches_filters(listing, make_search(city="Kraków")) is True
    assert listing_matches_filters(listing, make_search(city="krakow")) is True


# --- districts: list + legacy address fallback --------------------------

def test_district_structured_membership():
    listing = make_listing(district="Mokotów", address="Warszawa")
    assert listing_matches_filters(listing, make_search(districts=["Mokotów", "Wola"])) is True
    assert listing_matches_filters(listing, make_search(districts=["Wola"])) is False


def test_district_legacy_address_fallback():
    listing = make_listing(district=None, address="Warszawa, Wola district")
    assert listing_matches_filters(listing, make_search(districts=["Wola"])) is True


# --- offeredBy asymmetry -------------------------------------------------

def test_offered_by_owner_excludes_agency():
    agency = make_listing(offered_by=OfferedByEnum.AGENCY)
    assert listing_matches_filters(agency, make_search(offered_by="owner")) is False


def test_offered_by_owner_includes_unknown():
    # Unknown counts as owner (legacy listings stay visible).
    unknown = make_listing(offered_by=OfferedByEnum.UNKNOWN)
    assert listing_matches_filters(unknown, make_search(offered_by="owner")) is True
    owner = make_listing(offered_by=OfferedByEnum.OWNER)
    assert listing_matches_filters(owner, make_search(offered_by="owner")) is True


def test_offered_by_agency_is_exact():
    agency = make_listing(offered_by=OfferedByEnum.AGENCY)
    unknown = make_listing(offered_by=OfferedByEnum.UNKNOWN)
    assert listing_matches_filters(agency, make_search(offered_by="agency")) is True
    assert listing_matches_filters(unknown, make_search(offered_by="agency")) is False


# --- combined filters ----------------------------------------------------

def test_all_filters_together_match():
    listing = make_listing(
        city="Kraków", district="Grzegórzki", price=2000, size=45,
        max_tenants=2, room_type=RoomTypeEnum.SINGLE,
        rent_for_only=(RentForEnum.STUDENT,), offered_by=OfferedByEnum.OWNER,
    )
    search = make_search(
        city="krakow", districts=["Grzegórzki"], min_price=1000, max_price=2500,
        min_size=30, max_size=60, max_tenants=3, room_types=["Single"],
        rent_for=["Student"], offered_by="owner",
    )
    assert listing_matches_filters(listing, search) is True


def test_all_filters_together_one_fails():
    listing = make_listing(city="Kraków", price=3000)
    search = make_search(city="krakow", max_price=2500)
    assert listing_matches_filters(listing, search) is False
