"""Unit tests for SavedSearchCreate validation (pure logic, no Mongo)."""

import pytest
from pydantic import ValidationError

from app.schemas.saved_search_schema import SavedSearchCreate


def _payload(**overrides):
    base = {"name": "My search"}
    base.update(overrides)
    return base


def test_minimal_valid_payload():
    s = SavedSearchCreate(**_payload())
    assert s.name == "My search"
    assert s.districts == []
    assert s.notify_enabled is True


def test_full_valid_payload_by_alias():
    s = SavedSearchCreate(
        name="Kraków",
        city="Kraków",
        minPrice=1000,
        maxPrice=2500,
        roomTypes=["Single", "Double"],
        buildingTypes=["Apartment"],
        rentFor=["Student", "Open to All"],
        offeredBy="owner",
        notifyEnabled=False,
    )
    assert s.min_price == 1000
    assert s.max_price == 2500
    assert s.room_types == ["Single", "Double"]
    assert s.offered_by == "owner"
    assert s.notify_enabled is False


@pytest.mark.parametrize("name", ["", "x" * 61])
def test_name_length_bounds_rejected(name):
    with pytest.raises(ValidationError):
        SavedSearchCreate(**_payload(name=name))


def test_invalid_room_type_rejected():
    with pytest.raises(ValidationError):
        SavedSearchCreate(**_payload(roomTypes=["Penthouse"]))


def test_invalid_building_type_rejected():
    with pytest.raises(ValidationError):
        SavedSearchCreate(**_payload(buildingTypes=["Castle"]))


def test_invalid_rent_for_rejected():
    with pytest.raises(ValidationError):
        SavedSearchCreate(**_payload(rentFor=["Aliens"]))


@pytest.mark.parametrize("offered", ["landlord", "tenant", ""])
def test_invalid_offered_by_rejected(offered):
    with pytest.raises(ValidationError):
        SavedSearchCreate(**_payload(offeredBy=offered))


def test_offered_by_none_allowed():
    s = SavedSearchCreate(**_payload(offeredBy=None))
    assert s.offered_by is None


def test_min_price_gt_max_price_rejected():
    with pytest.raises(ValidationError):
        SavedSearchCreate(**_payload(minPrice=3000, maxPrice=1000))


def test_equal_prices_allowed():
    s = SavedSearchCreate(**_payload(minPrice=1500, maxPrice=1500))
    assert s.min_price == s.max_price


def test_only_min_price_set_allowed():
    s = SavedSearchCreate(**_payload(minPrice=2000))
    assert s.min_price == 2000
    assert s.max_price is None
