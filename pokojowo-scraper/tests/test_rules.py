from datetime import datetime, timezone

from pokojowo_scraper.enrich.rules import apply_rules
from pokojowo_scraper.schemas import ExtractedListing, fv


def make(desc: str, **kwargs) -> ExtractedListing:
    listing = ExtractedListing(
        source_url="https://olx.pl/d/oferta/x-IDx.html",
        source_site="olx",
        source_id="x",
        **kwargs,
    )
    listing.description_pl = fv(desc, "structured")
    return listing


def test_deposit_and_rent_extra():
    l = apply_rules(make("Kaucja: 2000 zł. Czynsz administracyjny 550 zł miesięcznie."))
    assert l.deposit.value == 2000.0
    assert l.deposit.source == "regex"
    assert l.rent_extra.value == 550.0


def test_floor_variants():
    assert apply_rules(make("Mieszkanie na 3 piętrze.")).floor.value == 3
    assert apply_rules(make("Pokój na parterze.")).floor.value == 0
    assert apply_rules(make("Winda w budynku.")).floor is None


def test_furnished_detection():
    assert apply_rules(make("W pełni umeblowane.")).furnished.value is True
    assert apply_rules(make("Mieszkanie nieumeblowane.")).furnished.value is False
    assert apply_rules(make("Pokój bez mebli.")).furnished.value is False


def test_available_from_polish_date():
    l = apply_rules(make("Pokój dostępny od 1 września."))
    assert l.available_from.value.month == 9
    assert l.available_from.value.day == 1


def test_available_od_zaraz():
    l = apply_rules(make("Do wynajęcia od zaraz!"))
    assert (datetime.now(timezone.utc) - l.available_from.value).days == 0


def test_phone_from_description():
    l = apply_rules(make("Kontakt: 601 234 567 po 17:00."))
    assert l.phone.value == "601234567"


def test_never_overwrites_structured():
    listing = make("Kaucja 9999 zł.")
    listing.deposit = fv(1500.0, "structured")
    assert apply_rules(listing).deposit.value == 1500.0
    assert listing.deposit.source == "structured"


def test_no_description_is_noop():
    listing = ExtractedListing(
        source_url="https://olx.pl/x", source_site="olx", source_id="x"
    )
    assert apply_rules(listing).deposit is None
