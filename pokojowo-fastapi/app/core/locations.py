"""Curated city/district suggestion lists for listings.

Districts are stored as free-text normalized strings, not enum values —
scraped Otodom/OLX listings arrive with arbitrary district names and a
hard enum would reject them. These lists power UI suggestions and the
GET /listings/meta/districts endpoint.
"""

CITY_DISTRICTS = {
    "Warszawa": [
        "Bemowo", "Białołęka", "Bielany", "Mokotów", "Ochota",
        "Praga-Południe", "Praga-Północ", "Rembertów", "Śródmieście",
        "Targówek", "Ursus", "Ursynów", "Wawer", "Wesoła", "Wilanów",
        "Włochy", "Wola", "Żoliborz",
    ],
    "Kraków": [
        "Stare Miasto", "Grzegórzki", "Prądnik Czerwony", "Prądnik Biały",
        "Krowodrza", "Bronowice", "Zwierzyniec", "Dębniki", "Łagiewniki-Borek Fałęcki",
        "Swoszowice", "Podgórze Duchackie", "Bieżanów-Prokocim", "Podgórze",
        "Czyżyny", "Mistrzejowice", "Bieńczyce", "Wzgórza Krzesławickie", "Nowa Huta",
    ],
    "Wrocław": [
        "Stare Miasto", "Śródmieście", "Krzyki", "Fabryczna", "Psie Pole",
    ],
    "Poznań": [
        "Stare Miasto", "Nowe Miasto", "Wilda", "Grunwald", "Jeżyce",
    ],
    "Gdańsk": [
        "Śródmieście", "Wrzeszcz", "Oliwa", "Przymorze", "Zaspa",
        "Brzeźno", "Nowy Port", "Orunia", "Chełm", "Piecki-Migowo",
    ],
    "Łódź": [
        "Bałuty", "Górna", "Polesie", "Śródmieście", "Widzew",
    ],
}

# Alternate spellings clients may send (search chips use English names)
CITY_NAME_ALIASES = {
    "warsaw": "Warszawa",
    "krakow": "Kraków",
    "cracow": "Kraków",
    "wroclaw": "Wrocław",
    "poznan": "Poznań",
    "gdansk": "Gdańsk",
    "lodz": "Łódź",
}


def canonical_city(name: str) -> str:
    """Map an incoming city name to its canonical Polish spelling."""
    if not name:
        return name
    return CITY_NAME_ALIASES.get(name.strip().lower(), name.strip())


def districts_for_city(city: str) -> list:
    return CITY_DISTRICTS.get(canonical_city(city), [])
