"""OLX extractor tests: __PRERENDERED_STATE__ (primary), JSON-LD and CSS
fallbacks. Synthetic pages mirror known structures; extend with real
fixtures from `pokojowo-scraper probe olx` (run on the Mac)."""

import json

from pokojowo_scraper.schemas import GeoPrecision, OfferedBy
from pokojowo_scraper.sites.olx import OlxAdapter

URL = "https://www.olx.pl/d/oferta/pokoj-mokotow-IDabc123.html"


def make_prerendered_page(ad: dict) -> str:
    state = json.dumps({"ad": {"ad": ad}})
    escaped = json.dumps(state)  # embed as the JS string literal OLX uses
    return f"<html><script>window.__PRERENDERED_STATE__= {escaped};</script></html>"


FULL_AD = {
    "id": 987654321,
    "title": "Pokój 1-osobowy, Mokotów, od zaraz",
    "description": "Wynajmę pokój.<br/>Kaucja 1500 zł. Blisko metra.",
    "price": {"regularPrice": {"value": 1500}},
    "params": [
        {"key": "m", "name": "Powierzchnia", "value": "16 m²"},
        {"key": "rooms", "name": "Liczba pokoi", "normalizedValue": "1 pokój"},
        {"key": "czynsz_dodatkowy", "name": "Czynsz", "value": "350 zł"},
        {"key": "furniture", "name": "Umeblowane", "value": "Tak"},
    ],
    "location": {
        "city": {"name": "Warszawa"},
        "district": {"name": "Mokotów"},
    },
    "map": {"lat": 52.1935, "lon": 21.0250, "radius": 0},
    "photos": ["https://ireland.apollo.olxcdn.com/v1/files/x;s={width}x{height}"],
    "business": False,
    "createdTime": "2026-07-21T08:00:00+02:00",
    "contact": {"phone": "601234567"},
}


def test_prerendered_full_extraction():
    listing = OlxAdapter().extract(URL, make_prerendered_page(FULL_AD))
    assert listing is not None
    assert listing.source_id == "987654321"
    assert listing.title.value == "Pokój 1-osobowy, Mokotów, od zaraz"
    assert "Kaucja 1500" in listing.description_pl.value
    assert "<br" not in listing.description_pl.value
    assert listing.price.value == 1500.0
    assert listing.size.value == 16.0
    assert listing.rooms.value == 1
    assert listing.rent_extra.value == 350.0
    assert listing.furnished.value is True
    assert listing.city.value == "Warszawa"
    assert listing.district.value == "Mokotów"
    assert listing.coordinates.value.latitude == 52.1935
    assert listing.geo_precision == GeoPrecision.EXACT
    assert listing.images.value == [
        "https://ireland.apollo.olxcdn.com/v1/files/x;s=1024x768"
    ]
    assert listing.offered_by.value == OfferedBy.OWNER
    assert listing.phone.value == "601234567"
    assert listing.posted_at.value.year == 2026


def test_business_flag_maps_to_agency():
    ad = dict(FULL_AD, business=True)
    listing = OlxAdapter().extract(URL, make_prerendered_page(ad))
    assert listing.offered_by.value == OfferedBy.AGENCY


def test_approximate_map_radius_downgrades_precision():
    ad = dict(FULL_AD, map={"lat": 52.19, "lon": 21.02, "radius": 800})
    listing = OlxAdapter().extract(URL, make_prerendered_page(ad))
    assert listing.geo_precision == GeoPrecision.DISTRICT


def test_missing_fields_stay_none():
    ad = {"id": 1, "title": "Pokój", "price": {"regularPrice": {"value": 900}}}
    listing = OlxAdapter().extract(URL, make_prerendered_page(ad))
    assert listing.size is None
    assert listing.coordinates is None
    assert listing.district is None
    assert listing.furnished is None


def test_json_ld_fallback():
    page = """
    <html><head><script type="application/ld+json">
    {"@type": "Product", "name": "Pokój Praga", "description": "Ładny pokój",
     "offers": {"price": "1100", "priceCurrency": "PLN"},
     "image": ["https://img.olx.pl/1.jpg"]}
    </script></head><body></body></html>"""
    listing = OlxAdapter().extract(URL, page)
    assert listing.title.value == "Pokój Praga"
    assert listing.price.value == 1100.0
    assert listing.images.value == ["https://img.olx.pl/1.jpg"]
    assert listing.source_id == "abc123"


def test_css_fallback():
    page = """
    <html><body>
      <h1 data-cy="ad_title">Pokój Wola</h1>
      <div data-testid="ad-price-container"><h3>1 300 zł</h3></div>
      <div data-cy="ad_description">Opis pokoju przy metrze.</div>
      <ul data-testid="ad-params-container">
        <li>Powierzchnia: 14 m²</li><li>Liczba pokoi: 1</li>
      </ul>
    </body></html>"""
    listing = OlxAdapter().extract(URL, page)
    assert listing.title.value == "Pokój Wola"
    assert listing.price.value == 1300.0
    assert listing.size.value == 14.0
    assert listing.rooms.value == 1


def test_unextractable_page_returns_none():
    assert OlxAdapter().extract(URL, "<html><body>nic tu nie ma</body></html>") is None


def test_listing_urls_dedup_and_normalize():
    html = """
    <html><body>
      <a href="/d/oferta/pokoj-IDx1.html?reason=extended">1</a>
      <a href="https://www.olx.pl/d/oferta/pokoj-IDx2.html#foo">2</a>
      <a href="/d/oferta/pokoj-IDx1.html">dup</a>
    </body></html>"""
    urls = OlxAdapter().listing_urls(html)
    assert urls == [
        "https://www.olx.pl/d/oferta/pokoj-IDx1.html",
        "https://www.olx.pl/d/oferta/pokoj-IDx2.html",
    ]
