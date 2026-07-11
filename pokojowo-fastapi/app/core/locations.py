"""Curated city/district suggestion lists for listings.

Districts are stored as free-text normalized strings, not enum values —
scraped Otodom/OLX listings arrive with arbitrary district names and a
hard enum would reject them. These lists power UI suggestions and the
GET /listings/meta/districts endpoint.
"""
import re

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


# All 16 Polish voivodeships with their capital(s) and major cities,
# lowercase, incl. common ASCII spellings. Used by the matching
# algorithm's same-region check.
VOIVODESHIP_CITIES = {
    "mazowieckie": ["warszawa", "warsaw", "radom", "płock", "plock", "siedlce", "ostrołęka", "ostroleka", "pruszków", "pruszkow", "legionowo"],
    "małopolskie": ["kraków", "krakow", "cracow", "tarnów", "tarnow", "nowy sącz", "nowy sacz", "oświęcim", "oswiecim", "zakopane"],
    "wielkopolskie": ["poznań", "poznan", "kalisz", "konin", "piła", "pila", "ostrów wielkopolski", "ostrow wielkopolski", "gniezno", "leszno"],
    "pomorskie": ["gdańsk", "gdansk", "gdynia", "sopot", "słupsk", "slupsk", "tczew", "wejherowo"],
    "dolnośląskie": ["wrocław", "wroclaw", "legnica", "wałbrzych", "walbrzych", "jelenia góra", "jelenia gora", "lubin", "głogów", "glogow"],
    "śląskie": ["katowice", "częstochowa", "czestochowa", "sosnowiec", "gliwice", "zabrze", "bielsko-biała", "bielsko-biala", "bytom", "rybnik", "tychy", "chorzów", "chorzow"],
    "łódzkie": ["łódź", "lodz", "piotrków trybunalski", "piotrkow trybunalski", "pabianice", "tomaszów mazowiecki", "tomaszow mazowiecki", "bełchatów", "belchatow", "zgierz"],
    "lubelskie": ["lublin", "chełm", "chelm", "zamość", "zamosc", "biała podlaska", "biala podlaska", "puławy", "pulawy"],
    "podkarpackie": ["rzeszów", "rzeszow", "przemyśl", "przemysl", "stalowa wola", "mielec", "tarnobrzeg", "krosno"],
    "podlaskie": ["białystok", "bialystok", "suwałki", "suwalki", "łomża", "lomza"],
    "zachodniopomorskie": ["szczecin", "koszalin", "stargard", "kołobrzeg", "kolobrzeg", "świnoujście", "swinoujscie"],
    "lubuskie": ["zielona góra", "zielona gora", "gorzów wielkopolski", "gorzow wielkopolski", "nowa sól", "nowa sol", "żary", "zary"],
    "kujawsko-pomorskie": ["bydgoszcz", "toruń", "torun", "włocławek", "wloclawek", "grudziądz", "grudziadz", "inowrocław", "inowroclaw"],
    "warmińsko-mazurskie": ["olsztyn", "elbląg", "elblag", "ełk", "elk", "ostróda", "ostroda"],
    "świętokrzyskie": ["kielce", "ostrowiec świętokrzyski", "ostrowiec swietokrzyski", "starachowice", "sandomierz"],
    "opolskie": ["opole", "kędzierzyn-koźle", "kedzierzyn-kozle", "nysa", "brzeg"],
}


_POLISH_LETTERS = "a-ząćęłńóśźż"


def _city_in_location(city: str, location: str) -> bool:
    # Word-boundary match so short names ("ełk", "piła") don't hit
    # inside longer words ("wielkopolski").
    pattern = rf"(?<![{_POLISH_LETTERS}]){re.escape(city)}(?![{_POLISH_LETTERS}])"
    return re.search(pattern, location) is not None


def region_for_location(location: str):
    """Return the voivodeship whose city name appears in the given
    location string (case-insensitive), or None."""
    if not location:
        return None
    loc = location.lower()
    for region, cities in VOIVODESHIP_CITIES.items():
        if any(_city_in_location(city, loc) for city in cities):
            return region
    return None
