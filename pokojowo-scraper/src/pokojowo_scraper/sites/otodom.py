"""Otodom adapter — extraction from the Next.js __NEXT_DATA__ payload,
which carries nearly every field in structured form (confidence 1.0)."""

import json
import logging
import re
from datetime import datetime

from bs4 import BeautifulSoup

from pokojowo_scraper.schemas import (
    Coordinates,
    ExtractedListing,
    GeoPrecision,
    OfferedBy,
    fv,
)
from pokojowo_scraper.sites.base import clean_text, parse_price, parse_size

logger = logging.getLogger(__name__)

CITY_PATHS = {
    "warszawa": "mazowieckie/warszawa/warszawa/warszawa",
    "krakow": "malopolskie/krakow/krakow/krakow",
    "wroclaw": "dolnoslaskie/wroclaw/wroclaw/wroclaw",
    "poznan": "wielkopolskie/poznan/poznan/poznan",
    "gdansk": "pomorskie/gdansk/gdansk/gdansk",
    "szczecin": "zachodniopomorskie/szczecin/szczecin/szczecin",
    "lodz": "lodzkie/lodz/lodz/lodz",
    "katowice": "slaskie/katowice/katowice/katowice",
}


class OtodomAdapter:
    site = "otodom"

    def search_url(self, city: str, page: int) -> str:
        if city not in CITY_PATHS:
            raise ValueError(f"unsupported Otodom city: {city}")
        path = CITY_PATHS[city]
        return (
            f"https://www.otodom.pl/pl/wyniki/wynajem/mieszkanie/{path}"
            f"?viewType=listing&page={page}"
        )

    def listing_urls(self, search_html: str) -> list[str]:
        soup = BeautifulSoup(search_html, "lxml")
        urls: list[str] = []
        for a in soup.select("a[href*='/pl/oferta/']"):
            href = a.get("href", "")
            if href.startswith("/"):
                href = f"https://www.otodom.pl{href}"
            href = href.split("?")[0]
            if href not in urls:
                urls.append(href)
        return urls

    def extract(self, url: str, html: str) -> ExtractedListing | None:
        soup = BeautifulSoup(html, "lxml")
        script = soup.select_one("script#__NEXT_DATA__")
        if not script or not script.string:
            logger.warning("no __NEXT_DATA__ on %s", url)
            return None
        try:
            ad = (
                json.loads(script.string)
                .get("props", {})
                .get("pageProps", {})
                .get("ad", {})
            )
        except json.JSONDecodeError:
            logger.error("bad __NEXT_DATA__ JSON on %s", url)
            return None
        if not ad:
            return None

        listing = ExtractedListing(
            source_url=url,
            source_site="otodom",
            source_id=str(ad.get("id") or url.rstrip("/").rsplit("-", 1)[-1]),
        )

        if title := ad.get("title"):
            listing.title = fv(clean_text(title), "structured")

        if desc_html := ad.get("description"):
            text = clean_text(BeautifulSoup(desc_html, "lxml").get_text(" "))
            if text:
                listing.description_pl = fv(text, "structured")

        target = ad.get("target", {}) or {}
        price = _as_float(target.get("Price"))
        if price is None:
            for char in ad.get("characteristics", []) or []:
                if char.get("key") == "price":
                    price = _as_float(char.get("value"))
                    break
        if price is None:
            for info in ad.get("topInformation", []) or []:
                if "zł" in str(info.get("value", "")):
                    price = parse_price(str(info["value"]))
                    break
        if price is not None and price >= 100:
            listing.price = fv(price, "structured")

        if rent := _as_float(target.get("Rent")):
            listing.rent_extra = fv(rent, "structured")
        if deposit := _as_float(target.get("Deposit")):
            listing.deposit = fv(deposit, "structured")

        size = _as_float(target.get("Area"))
        if size is None:
            for char in ad.get("characteristics", []) or []:
                if "area" in char.get("key", "").lower() and char.get("value"):
                    size = parse_size(f"{char['value']} m²")
                    break
        if size is not None:
            listing.size = fv(size, "structured")

        rooms_val = target.get("Rooms_num")
        if isinstance(rooms_val, list):
            rooms_val = rooms_val[0] if rooms_val else None
        if rooms_val is not None:
            try:
                listing.rooms = fv(int(rooms_val), "structured")
            except (TypeError, ValueError):
                pass

        floor_val = target.get("Floor_no")
        if isinstance(floor_val, list):
            floor_val = floor_val[0] if floor_val else None
        if isinstance(floor_val, str):
            m = re.search(r"\d+", floor_val)
            if "parter" in floor_val.lower():
                listing.floor = fv(0, "structured")
            elif m:
                listing.floor = fv(int(m.group()), "structured")

        # Location — structured city/district/street + coordinates
        location = ad.get("location", {}) or {}
        loc_address = location.get("address", {}) or {}
        city = (loc_address.get("city") or {}).get("name")
        district = (loc_address.get("district") or {}).get("name")
        street = (loc_address.get("street") or {}).get("name")
        if city:
            listing.city = fv(city, "structured")
        if district:
            listing.district = fv(district, "structured")
        parts = [p for p in (city, district, street) if p]
        if parts:
            listing.address = fv(", ".join(parts), "structured")

        coords = location.get("coordinates") or location.get("mapDetails") or {}
        lat, lng = _as_float(coords.get("latitude")), _as_float(coords.get("longitude"))
        if lat is not None and lng is not None:
            listing.coordinates = fv(
                Coordinates(latitude=lat, longitude=lng), "structured"
            )
            listing.geo_precision = GeoPrecision.EXACT

        images = []
        for img in ad.get("images", []) or []:
            if isinstance(img, dict):
                u = img.get("large") or img.get("medium") or img.get("small")
                if u:
                    images.append(u)
            elif isinstance(img, str):
                images.append(img)
        if images:
            listing.images = fv(images, "structured")

        # Advertiser type appears in several places depending on page version
        advertiser_raw = str(
            ad.get("advertiserType")
            or (ad.get("owner") or {}).get("type")
            or (ad.get("agency") or {}).get("type")
            or target.get("Advert_type")
            or ""
        ).lower()
        if "private" in advertiser_raw or "prywat" in advertiser_raw:
            listing.offered_by = fv(OfferedBy.OWNER, "structured")
        elif any(k in advertiser_raw for k in ("agency", "business", "developer", "biuro")):
            listing.offered_by = fv(OfferedBy.AGENCY, "structured")
        elif ad.get("agency"):
            listing.offered_by = fv(OfferedBy.AGENCY, "structured")

        owner_phones = (ad.get("owner") or {}).get("phones") or []
        if owner_phones and isinstance(owner_phones[0], str):
            phone = owner_phones[0]
            if not re.match(r"^\+?\*+\d?$", phone):
                listing.phone = fv(phone, "structured")

        if created := ad.get("dateCreated"):
            try:
                listing.posted_at = fv(
                    datetime.fromisoformat(str(created).replace("Z", "+00:00")),
                    "structured",
                )
            except ValueError:
                pass

        return listing


def _as_float(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
