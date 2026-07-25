"""Otodom extractor tests against a synthetic __NEXT_DATA__ page that
mirrors the real structure. Replace/extend with real fixtures from
`pokojowo-scraper probe otodom` (run on the Mac)."""

import json

from pokojowo_scraper.schemas import GeoPrecision, OfferedBy
from pokojowo_scraper.sites.otodom import OtodomAdapter

URL = "https://www.otodom.pl/pl/oferta/kawalerka-mokotow-ID4abcd"


def make_page(ad: dict) -> str:
    payload = {"props": {"pageProps": {"ad": ad}}}
    return (
        "<html><body><script id='__NEXT_DATA__' type='application/json'>"
        + json.dumps(payload)
        + "</script></body></html>"
    )


FULL_AD = {
    "id": 65432100,
    "title": "Kawalerka na Mokotowie, ul. Puławska",
    "description": "<p>Przytulna kawalerka <b>25 m²</b> blisko metra Wilanowska.</p>",
    "target": {
        "Price": 2600,
        "Rent": 450,
        "Deposit": 3000,
        "Area": 25.5,
        "Rooms_num": ["1"],
        "Floor_no": ["floor_3"],
    },
    "characteristics": [],
    "location": {
        "address": {
            "city": {"name": "Warszawa"},
            "district": {"name": "Mokotów"},
            "street": {"name": "Puławska"},
        },
        "coordinates": {"latitude": 52.1934, "longitude": 21.0245},
    },
    "images": [
        {"large": "https://img.otodom.pl/1_large.jpg", "medium": "https://img.otodom.pl/1_m.jpg"},
        {"medium": "https://img.otodom.pl/2_m.jpg"},
    ],
    "advertiserType": "private",
    "owner": {"phones": ["+48601234567"]},
    "dateCreated": "2026-07-20T10:30:00Z",
}


def test_full_ad_extracts_every_field():
    listing = OtodomAdapter().extract(URL, make_page(FULL_AD))
    assert listing is not None
    assert listing.source_id == "65432100"
    assert listing.title.value == "Kawalerka na Mokotowie, ul. Puławska"
    assert "25 m²" in listing.description_pl.value
    assert "<p>" not in listing.description_pl.value
    assert listing.price.value == 2600.0
    assert listing.rent_extra.value == 450.0
    assert listing.deposit.value == 3000.0
    assert listing.size.value == 25.5
    assert listing.rooms.value == 1
    assert listing.floor.value == 3
    assert listing.city.value == "Warszawa"
    assert listing.district.value == "Mokotów"
    assert listing.address.value == "Warszawa, Mokotów, Puławska"
    assert listing.coordinates.value.latitude == 52.1934
    assert listing.coordinates.value.longitude == 21.0245
    assert listing.geo_precision == GeoPrecision.EXACT
    assert listing.images.value == [
        "https://img.otodom.pl/1_large.jpg",
        "https://img.otodom.pl/2_m.jpg",
    ]
    assert listing.offered_by.value == OfferedBy.OWNER
    assert listing.phone.value == "+48601234567"
    assert listing.posted_at.value.year == 2026
    # provenance
    assert listing.price.source == "structured"
    assert listing.price.confidence == 1.0


def test_missing_fields_stay_none_no_fabricated_defaults():
    ad = {"id": 1, "title": "Pokój", "target": {"Price": 1200}}
    listing = OtodomAdapter().extract(URL, make_page(ad))
    assert listing.price.value == 1200.0
    assert listing.size is None          # the old code fabricated 40.0 here
    assert listing.coordinates is None
    assert listing.district is None
    assert listing.offered_by is None
    assert listing.geo_precision is None


def test_agency_detection_from_agency_object():
    ad = {"id": 2, "title": "Apartament", "target": {"Price": 4000},
          "agency": {"id": 99, "name": "XYZ Nieruchomości"}}
    listing = OtodomAdapter().extract(URL, make_page(ad))
    assert listing.offered_by.value == OfferedBy.AGENCY


def test_masked_phone_is_dropped():
    ad = {"id": 3, "title": "Pokój", "target": {"Price": 1500},
          "owner": {"phones": ["+*********5"]}}
    listing = OtodomAdapter().extract(URL, make_page(ad))
    assert listing.phone is None


def test_mapdetails_coordinate_fallback():
    ad = {"id": 4, "title": "Pokój", "target": {"Price": 1500},
          "location": {"mapDetails": {"latitude": "52.23", "longitude": "21.01"}}}
    listing = OtodomAdapter().extract(URL, make_page(ad))
    assert listing.coordinates.value.latitude == 52.23


def test_no_next_data_returns_none():
    assert OtodomAdapter().extract(URL, "<html><h1>Oferta</h1></html>") is None


def test_price_below_sanity_floor_dropped():
    ad = {"id": 5, "title": "Pokój", "target": {"Price": 1}}
    listing = OtodomAdapter().extract(URL, make_page(ad))
    assert listing.price is None


def test_search_url_and_listing_urls():
    adapter = OtodomAdapter()
    assert "mazowieckie/warszawa/warszawa/warszawa" in adapter.search_url("warszawa", 2)
    html = """
    <html><body>
      <a href="/pl/oferta/kawalerka-ID1?from=list">a</a>
      <a href="https://www.otodom.pl/pl/oferta/pokoj-ID2">b</a>
      <a href="/pl/oferta/kawalerka-ID1">dup</a>
      <a href="/pl/inne/xyz">not a listing</a>
    </body></html>"""
    urls = adapter.listing_urls(html)
    assert urls == [
        "https://www.otodom.pl/pl/oferta/kawalerka-ID1",
        "https://www.otodom.pl/pl/oferta/pokoj-ID2",
    ]
