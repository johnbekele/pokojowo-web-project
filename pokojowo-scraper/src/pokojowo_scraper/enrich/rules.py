"""Regex/rules layer over Polish description text (confidence 0.85).
Fills only fields the structured layer left empty."""

import re
from datetime import datetime, timezone

from pokojowo_scraper.schemas import ExtractedListing, fv
from pokojowo_scraper.sites.base import parse_phone

_DEPOSIT_RE = re.compile(r"kaucj[aiąę]\w*\s*[:\-–]?\s*(\d[\d\s\xa0]*)\s*(?:zł|PLN)?", re.I)
_RENT_EXTRA_RE = re.compile(
    r"czynsz\w*\s*(?:administracyjny|adm\.?)?\s*[:\-–]?\s*(\d[\d\s\xa0]*)\s*(?:zł|PLN)", re.I
)
_FLOOR_RE = re.compile(r"(\d{1,2})\s*\.?\s*pi[eę]tr", re.I)
_GROUND_FLOOR_RE = re.compile(r"\bparter", re.I)
_FURNISHED_RE = re.compile(r"\bumeblowan", re.I)
_UNFURNISHED_RE = re.compile(r"\b(?:nieumeblowan|bez\s+mebli)", re.I)

_MONTHS = {
    "stycznia": 1, "styczeń": 1, "lutego": 2, "luty": 2,
    "marca": 3, "marzec": 3, "kwietnia": 4, "kwiecień": 4,
    "maja": 5, "maj": 5, "czerwca": 6, "czerwiec": 6,
    "lipca": 7, "lipiec": 7, "sierpnia": 8, "sierpień": 8,
    "września": 9, "wrzesień": 9, "października": 10, "październik": 10,
    "listopada": 11, "listopad": 11, "grudnia": 12, "grudzień": 12,
}
_AVAILABLE_RE = re.compile(
    r"(?:dost[eę]pn\w+|woln\w+|do\s+wynaj[eę]cia)?\s*od\s+(\d{1,2})\s+(" +
    "|".join(_MONTHS) + r")",
    re.I,
)
_FROM_NOW_RE = re.compile(r"od\s+zaraz", re.I)


def _amount(m: re.Match) -> float | None:
    raw = m.group(1).replace("\xa0", "").replace(" ", "")
    try:
        v = float(raw)
    except ValueError:
        return None
    return v if 50 <= v <= 100_000 else None


def apply_rules(listing: ExtractedListing) -> ExtractedListing:
    """Extract deposit/rent-extra/floor/furnished/availability/phone from
    the Polish description. Never overwrites structured values."""
    text = listing.description_pl.value if listing.description_pl else ""
    if not text:
        return listing

    if listing.deposit is None and (m := _DEPOSIT_RE.search(text)):
        if (v := _amount(m)) is not None:
            listing.deposit = fv(v, "regex")

    if listing.rent_extra is None and (m := _RENT_EXTRA_RE.search(text)):
        if (v := _amount(m)) is not None:
            listing.rent_extra = fv(v, "regex")

    if listing.floor is None:
        if _GROUND_FLOOR_RE.search(text):
            listing.floor = fv(0, "regex")
        elif m := _FLOOR_RE.search(text):
            floor = int(m.group(1))
            if floor <= 60:
                listing.floor = fv(floor, "regex")

    if listing.furnished is None:
        if _UNFURNISHED_RE.search(text):
            listing.furnished = fv(False, "regex")
        elif _FURNISHED_RE.search(text):
            listing.furnished = fv(True, "regex")

    if listing.available_from is None:
        if m := _AVAILABLE_RE.search(text):
            day, month = int(m.group(1)), _MONTHS[m.group(2).lower()]
            now = datetime.now(timezone.utc)
            year = now.year if (month, day) >= (now.month, now.day) else now.year + 1
            try:
                listing.available_from = fv(
                    datetime(year, month, min(day, 28), tzinfo=timezone.utc), "regex"
                )
            except ValueError:
                pass
        elif _FROM_NOW_RE.search(text):
            listing.available_from = fv(datetime.now(timezone.utc), "regex")

    if listing.phone is None and (phone := parse_phone(text)):
        listing.phone = fv(phone, "regex")

    return listing
