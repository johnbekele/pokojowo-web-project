"""The order geocode() tries a place in, and the precision it reports.

Nominatim itself is stubbed out — these tests are about which queries we send
and how honest we are about the result, not about OSM's data.
"""
import pytest

from app.core.geo import GeoPrecision
from app.services import geocode_service


@pytest.fixture
def lookups(monkeypatch):
    """Record every query, resolving only the ones a test opts into."""
    asked = []
    resolvable = {}

    async def fake_lookup(key, query):
        asked.append(query)
        return resolvable.get(query)

    monkeypatch.setattr(geocode_service, "_cached_lookup", fake_lookup)
    return asked, resolvable


async def test_returns_street_precision_for_a_real_address(lookups):
    asked, resolvable = lookups
    resolvable["Racławicka 99, Warszawa, Polska"] = (52.19, 21.02)

    point, precision = await geocode_service.geocode(
        address="Racławicka 99, Warszawa", city="Warszawa", district="Mokotów"
    )

    assert precision is GeoPrecision.STREET
    assert point == {"type": "Point", "coordinates": [21.02, 52.19]}
    assert len(asked) == 1


async def test_falls_back_to_district_then_city(lookups):
    asked, resolvable = lookups
    resolvable["Warszawa, Polska"] = (52.23, 21.01)

    point, precision = await geocode_service.geocode(
        address="Nowhere Street 1", city="Warszawa", district="Mokotów"
    )

    assert precision is GeoPrecision.CITY
    assert asked == [
        "Nowhere Street 1, Polska",
        "Mokotów, Warszawa, Polska",
        "Warszawa, Polska",
    ]
    assert point["coordinates"] == [21.01, 52.23]


async def test_retries_an_address_that_carries_a_blurb(lookups):
    """Landlords type "Mokotow, Warsaw - bright room"; only the head resolves."""
    asked, resolvable = lookups
    resolvable["Mokotow, Warsaw, Polska"] = (52.19, 21.04)

    point, precision = await geocode_service.geocode(
        address="Mokotow, Warsaw - bright room near metro"
    )

    assert precision is GeoPrecision.DISTRICT
    assert asked == [
        "Mokotow, Warsaw - bright room near metro, Polska",
        "Mokotow, Warsaw, Polska",
    ]
    assert point["coordinates"] == [21.04, 52.19]


async def test_skips_the_street_lookup_when_the_address_is_just_the_area(lookups):
    asked, resolvable = lookups
    resolvable["Mokotów, Warszawa, Polska"] = (52.19, 21.04)

    _, precision = await geocode_service.geocode(
        address="Mokotów, Warszawa", city="Warszawa", district="Mokotów"
    )

    assert precision is GeoPrecision.DISTRICT
    assert asked == ["Mokotów, Warszawa, Polska"]


async def test_returns_none_without_anything_to_look_up(lookups):
    asked, _ = lookups
    assert await geocode_service.geocode(address="  ", city=None) is None
    assert asked == []


async def test_returns_none_when_nothing_resolves(lookups):
    assert await geocode_service.geocode(city="Atlantyda") is None


async def test_geocode_if_missing_keeps_exact_coordinates(lookups):
    asked, resolvable = lookups
    resolvable["Warszawa, Polska"] = (52.23, 21.01)

    unchanged = await geocode_service.geocode_if_missing(
        {"type": "Point", "coordinates": [21.0, 52.2]},
        GeoPrecision.EXACT.value,
        city="Warszawa",
    )

    assert unchanged is None
    assert asked == []


async def test_geocode_if_missing_improves_on_a_city_centroid(lookups):
    _, resolvable = lookups
    resolvable["Mokotów, Warszawa, Polska"] = (52.19, 21.04)

    result = await geocode_service.geocode_if_missing(
        {"type": "Point", "coordinates": [21.01, 52.23]},
        GeoPrecision.CITY.value,
        city="Warszawa",
        district="Mokotów",
    )

    assert result is not None
    assert result[1] is GeoPrecision.DISTRICT
