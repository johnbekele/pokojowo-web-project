from datetime import datetime, timezone

from pokojowo_scraper.publish import build_import_payload
from pokojowo_scraper.schemas import (
    BuildingType,
    Coordinates,
    ExtractedListing,
    GeoPrecision,
    OfferedBy,
    RoomType,
    fv,
)


def full_listing() -> ExtractedListing:
    l = ExtractedListing(
        source_url="https://www.otodom.pl/pl/oferta/x-ID1",
        source_site="otodom",
        source_id="1",
    )
    l.address = fv("Warszawa, Mokotów, Puławska", "structured")
    l.price = fv(2600.0, "structured")
    l.size = fv(28.0, "structured")
    l.description_pl = fv("Opis po polsku.", "structured")
    l.description_en = fv("Description in English.", "llm")
    l.city = fv("Warszawa", "structured")
    l.district = fv("Mokotów", "structured")
    l.coordinates = fv(Coordinates(latitude=52.19, longitude=21.02), "structured")
    l.geo_precision = GeoPrecision.EXACT
    l.offered_by = fv(OfferedBy.OWNER, "structured")
    l.phone = fv("601234567", "structured")
    l.available_from = fv(datetime(2026, 9, 1, tzinfo=timezone.utc), "regex")
    l.room_type = fv(RoomType.SINGLE, "llm")
    l.building_type = fv(BuildingType.BLOCK, "llm")
    l.rent_for_only = fv(["Student"], "llm")
    l.max_tenants = fv(1, "llm")
    l.close_to = fv(["Metro", "Park"], "overpass")
    return l


def test_payload_matches_import_contract():
    p = build_import_payload(full_listing(), ["/uploads/listing/a.jpg"])
    assert p["address"] == "Warszawa, Mokotów, Puławska"
    assert p["price"] == 2600.0
    assert p["size"] == 28.0
    assert p["description"] == {"pl": "Opis po polsku.", "en": "Description in English."}
    assert p["sourceUrl"] == "https://www.otodom.pl/pl/oferta/x-ID1"
    assert p["sourceSite"] == "otodom"
    assert p["images"] == ["/uploads/listing/a.jpg"]
    assert p["latitude"] == 52.19 and p["longitude"] == 21.02
    assert p["city"] == "Warszawa"
    assert p["district"] == "Mokotów"
    assert p["offeredBy"] == "owner"
    assert p["phone"] == "601234567"
    assert p["canBeContacted"] == ["Message", "Phone"]
    assert p["roomType"] == "Single"          # exact enum spelling
    assert p["buildingType"] == "Block"
    assert p["rentForOnly"] == ["Student"]
    assert p["maxTenants"] == 1
    assert p["closeTo"] == ["Metro", "Park"]
    assert p["availableFrom"].startswith("2026-09-01")


def test_optional_fields_omitted_not_nulled():
    l = full_listing()
    l.coordinates = None
    l.phone = None
    l.room_type = None
    p = build_import_payload(l, ["/uploads/x.jpg"])
    # omitted keys let backend defaults apply; latitude without longitude is invalid
    assert "latitude" not in p and "longitude" not in p
    assert "phone" not in p and "canBeContacted" not in p
    assert "roomType" not in p
