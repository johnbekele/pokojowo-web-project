from pokojowo_scraper.quality import check_gates, score
from pokojowo_scraper.schemas import (
    Coordinates,
    ExtractedListing,
    GeoPrecision,
    fv,
)


def rich_listing() -> ExtractedListing:
    l = ExtractedListing(
        source_url="https://otodom.pl/pl/oferta/x-ID1",
        source_site="otodom",
        source_id="1",
    )
    l.title = fv("Kawalerka Mokotów", "structured")
    l.price = fv(2600.0, "structured")
    l.size = fv(28.0, "structured")
    l.rooms = fv(1, "structured")
    l.description_pl = fv("Opis " * 100, "structured")   # >300 chars
    l.description_en = fv("Description " * 60, "llm")
    l.address = fv("Warszawa, Mokotów, Puławska", "structured")
    l.city = fv("Warszawa", "structured")
    l.district = fv("Mokotów", "structured")
    l.coordinates = fv(Coordinates(latitude=52.19, longitude=21.02), "structured")
    l.geo_precision = GeoPrecision.EXACT
    l.images = fv([f"https://img/{i}.jpg" for i in range(5)], "structured")
    l.deposit = fv(3000.0, "regex")
    l.phone = fv("601234567", "structured")
    l.offered_by = fv("owner", "structured")
    l.close_to = fv(["Metro", "Park"], "overpass")
    l.available_from = fv(__import__("datetime").datetime(2026, 9, 1), "regex")
    return l


def bare_listing() -> ExtractedListing:
    l = ExtractedListing(
        source_url="https://olx.pl/d/oferta/y-ID2.html",
        source_site="olx",
        source_id="2",
    )
    l.title = fv("Pokój", "structured")
    l.price = fv(1200.0, "structured")
    return l


def test_rich_listing_scores_above_auto_publish_threshold():
    s = score(rich_listing())
    assert s.confidence >= 0.85
    assert s.gates_failed == []


def test_bare_listing_scores_low_and_fails_gates():
    s = score(bare_listing())
    assert s.confidence < 0.3
    assert "missing_size" in s.gates_failed
    assert "missing_translation" in s.gates_failed
    assert "no_images" in s.gates_failed
    assert "geo_imprecise" in s.gates_failed


def test_city_centroid_coords_get_minimal_credit_and_fail_gate():
    l = rich_listing()
    l.geo_precision = GeoPrecision.CITY
    s = score(l)
    assert "geo_imprecise" in s.gates_failed
    assert s.confidence < score(rich_listing()).confidence


def test_price_out_of_band_gate():
    l = rich_listing()
    l.price = fv(150_000.0, "structured")
    assert "price_out_of_band" in check_gates(l)


def test_suspect_translation_fails_gate():
    l = rich_listing()
    l.translation_suspect = True
    assert "translation_suspect" in check_gates(l)


def test_llm_provenance_discounts_confidence():
    l = rich_listing()
    structured = score(l).confidence
    l.district = fv("Mokotów", "llm")
    assert score(l).confidence < structured


def test_short_description_earns_partial_credit():
    l = rich_listing()
    full = score(l).confidence
    l.description_pl = fv("Krótki opis.", "structured")
    assert score(l).confidence < full
