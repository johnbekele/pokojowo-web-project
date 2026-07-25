from pokojowo_scraper.sites.base import parse_phone, parse_price, parse_size


def test_parse_price_variants():
    assert parse_price("2 500 zł") == 2500.0
    assert parse_price("2500zł") == 2500.0
    assert parse_price("1.200 zł") == 1200.0        # thousands dot
    assert parse_price("2500,50 zł") == 2500.50     # decimal comma
    assert parse_price("2\xa0500 zł/mies.") == 2500.0
    assert parse_price("brak ceny") is None
    assert parse_price("50 zł") is None             # below sanity floor


def test_parse_size_variants():
    assert parse_size("Powierzchnia: 45 m²") == 45.0
    assert parse_size("16,5 m2") == 16.5
    assert parse_size("2000 m²") is None            # above sanity cap
    assert parse_size("bez metrażu") is None


def test_parse_phone_variants():
    assert parse_phone("tel. 601 234 567") == "601234567"
    assert parse_phone("+48 601-234-567") == "+48601234567"
    assert parse_phone("zadzwoń: 601234567!") == "601234567"
    assert parse_phone("rok 2026, mieszkanie 45m") is None
