"""SiteAdapter protocol + shared text-parsing helpers.

extract() is a pure function over (url, html) so it can be tested against
saved fixture pages without any network access."""

import re
from typing import Protocol

from pokojowo_scraper.schemas import ExtractedListing


class SearchSpec:
    def __init__(self, city: str, pages: int):
        self.city = city
        self.pages = pages


class SiteAdapter(Protocol):
    site: str

    def search_url(self, city: str, page: int) -> str: ...

    def listing_urls(self, search_html: str) -> list[str]: ...

    def extract(self, url: str, html: str) -> ExtractedListing | None: ...


# ---- shared parsing helpers -------------------------------------------------

_PRICE_RE = re.compile(r"(\d[\d\s\xa0.,]*)\s*(?:zł|PLN)", re.IGNORECASE)
_SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*m(?:²|2)", re.IGNORECASE)
_PHONE_RE = re.compile(
    r"(?:\+48[\s-]?)?(?:\d{3}[\s-]?\d{3}[\s-]?\d{3}|\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})"
)


def parse_price(text: str) -> float | None:
    m = _PRICE_RE.search(text)
    if not m:
        return None
    raw = m.group(1).replace("\xa0", "").replace(" ", "").replace(",", ".")
    # "2.500" thousands separator vs "2500.50" decimal — treat trailing
    # 3-digit groups after a dot as thousands only when there's no other dot
    if raw.count(".") == 1 and len(raw.split(".")[1]) == 3:
        raw = raw.replace(".", "")
    try:
        value = float(raw)
    except ValueError:
        return None
    return value if value >= 100 else None


def parse_size(text: str) -> float | None:
    m = _SIZE_RE.search(text)
    if not m:
        return None
    try:
        value = float(m.group(1).replace(",", "."))
    except ValueError:
        return None
    return value if 4 <= value <= 1000 else None


def parse_phone(text: str) -> str | None:
    m = _PHONE_RE.search(text)
    if not m:
        return None
    digits = re.sub(r"[\s-]", "", m.group(0))
    # 9-digit Polish numbers (optionally +48-prefixed)
    if len(digits.lstrip("+48")) == 9 or (len(digits) == 9 and digits.isdigit()):
        return digits
    return None


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()
