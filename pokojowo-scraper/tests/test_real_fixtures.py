"""Regression coverage for the checked-in pages captured from OLX and Otodom."""

from pathlib import Path

import pytest

from pokojowo_scraper.sites import ADAPTERS

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.parametrize(
    ("site", "fixture", "expected"),
    [
        (
            "olx",
            "detail_warszawa_0.html",
            {
                "source_id": "1086806901",
                "title": "Przytulny pokój 1-os. WILANÓW/MOKOTÓW – 600 m od TVN! - od września",
                "price": 690.0,
                "image_count": 8,
            },
        ),
        (
            "olx",
            "detail_warszawa_1.html",
            {
                "source_id": "1082522353",
                "title": "Pokój z prywatną łazienką Jagiellońska 77",
                "price": 2200.0,
                "image_count": 6,
            },
        ),
        (
            "olx",
            "detail_warszawa_2.html",
            {
                "source_id": "1086746120",
                "title": "Wynajmę pokój w centrum",
                "price": 1800.0,
                "image_count": 8,
            },
        ),
        (
            "otodom",
            "detail_warszawa_0.html",
            {
                "source_id": "65091300",
                "title": "Piękne mieszkanie na warszawskim Powiślu",
                "price": 3300.0,
                "address": "ul. Okrąg",
                "rooms": 2,
                "image_count": 16,
            },
        ),
        (
            "otodom",
            "detail_warszawa_1.html",
            {
                "source_id": "60679244",
                "title": "Mieszkanie / Gabinet / Biuro",
                "price": 2700.0,
                "address": "ul. Wolska",
                "rooms": 1,
                "image_count": 5,
            },
        ),
        (
            "otodom",
            "detail_warszawa_2.html",
            {
                "source_id": "63894586",
                "title": "komfortowe 2-pok., 50m2 + duży balkon, Gocław",
                "price": 3000.0,
                "address": "ul. Eugeniusza Kwiatkowskiego",
                "rooms": 2,
                "image_count": 10,
            },
        ),
    ],
)
def test_real_detail_fixture_extracts_expected_values(site, fixture, expected):
    path = FIXTURES / site / fixture
    listing = ADAPTERS[site].extract(str(path), path.read_text(encoding="utf-8"))

    assert listing is not None
    assert listing.source_id == expected["source_id"]
    assert listing.title.value == expected["title"]
    assert listing.price.value == expected["price"]
    assert listing.description_pl is not None
    assert len(listing.description_pl.value) >= 100
    assert listing.images is not None
    assert len(listing.images.value) == expected["image_count"]
    for field in ("address", "rooms"):
        if field in expected:
            assert getattr(listing, field).value == expected[field]


@pytest.mark.parametrize(
    ("site", "expected_count", "expected_first"),
    [
        (
            "olx",
            48,
            "https://www.olx.pl/d/oferta/przytulny-pokoj-1-os-wilanow-mokotow-600-m-od-tvn-od-wrzesnia-CID3-ID1by87z.html",
        ),
        (
            "otodom",
            37,
            "https://www.otodom.pl/pl/oferta/piekne-mieszkanie-na-warszawskim-powislu-ID4p7dG",
        ),
    ],
)
def test_real_search_fixture_extracts_listing_urls(site, expected_count, expected_first):
    path = FIXTURES / site / "search_warszawa.html"
    urls = ADAPTERS[site].listing_urls(path.read_text(encoding="utf-8"))

    assert len(urls) == expected_count
    assert urls[0] == expected_first
    assert len(urls) == len(set(urls))


@pytest.mark.parametrize(
    ("site", "fixture"),
    [
        ("olx", "detail_warszawa_0.html"),
        ("olx", "detail_warszawa_1.html"),
        ("olx", "detail_warszawa_2.html"),
        ("otodom", "detail_warszawa_0.html"),
        ("otodom", "detail_warszawa_1.html"),
        ("otodom", "detail_warszawa_2.html"),
    ],
)
def test_real_fixture_without_primary_markup_fails_cleanly(site, fixture):
    path = FIXTURES / site / fixture
    # Simulate a redesign that removes all supported extraction containers. The
    # adapter must return no listing rather than manufacturing a partial record.
    html = "<html><body><p>source markup changed</p></body></html>"

    assert ADAPTERS[site].extract(str(path), html) is None
