"""OLX adapter — deterministic extraction from embedded JSON.

OLX detail pages embed structured state in two places we try in order:
1. window.__PRERENDERED_STATE__ — a JSON string with the full offer object
   (params, structured location incl. coordinates + district, photos,
   business flag). Exact shape to be confirmed against Phase-0 fixtures.
2. JSON-LD <script type="application/ld+json"> — price, images, description.
CSS selectors are the last resort (title/price/description/params only).
"""

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

CITY_SLUGS = [
    "warszawa", "krakow", "wroclaw", "poznan",
    "gdansk", "szczecin", "lodz", "katowice",
]

_PRERENDERED_RE = re.compile(
    r'window\.__PRERENDERED_STATE__\s*=\s*"((?:[^"\\]|\\.)*)"'
)


class OlxAdapter:
    site = "olx"

    def search_url(self, city: str, page: int) -> str:
        if city not in CITY_SLUGS:
            raise ValueError(f"unsupported OLX city: {city}")
        base = f"https://www.olx.pl/nieruchomosci/stancje-pokoje/{city}/"
        return f"{base}?page={page}" if page > 1 else base

    def listing_urls(self, search_html: str) -> list[str]:
        soup = BeautifulSoup(search_html, "lxml")
        urls: list[str] = []
        for a in soup.select("a[href*='/d/oferta/']"):
            href = a.get("href", "")
            if href.startswith("/"):
                href = f"https://www.olx.pl{href}"
            href = href.split("#")[0].split("?")[0]
            if "olx.pl" in href and href not in urls:
                urls.append(href)
        return urls

    def extract(self, url: str, html: str) -> ExtractedListing | None:
        offer = self._prerendered_offer(html)
        if offer:
            return self._from_offer_json(url, offer)
        listing = self._from_json_ld(url, html)
        if listing:
            return listing
        return self._from_css(url, html)

    # ---- source 1: __PRERENDERED_STATE__ ------------------------------------

    def _prerendered_offer(self, html: str) -> dict | None:
        m = _PRERENDERED_RE.search(html)
        if not m:
            return None
        try:
            state = json.loads(json.loads(f'"{m.group(1)}"'))
        except (json.JSONDecodeError, ValueError):
            logger.warning("failed to decode __PRERENDERED_STATE__")
            return None
        # The offer object lives at ad.ad in current page versions
        ad = state.get("ad") or {}
        if isinstance(ad, dict) and ad.get("ad"):
            ad = ad["ad"]
        return ad if ad.get("id") else None

    def _from_offer_json(self, url: str, ad: dict) -> ExtractedListing:
        listing = ExtractedListing(
            source_url=url, source_site="olx", source_id=str(ad["id"])
        )

        if title := ad.get("title"):
            listing.title = fv(clean_text(title), "structured")
        if desc := ad.get("description"):
            text = clean_text(BeautifulSoup(desc, "lxml").get_text(" "))
            if text:
                listing.description_pl = fv(text, "structured")

        # price: ad.price.regularPrice.value in current shape
        price_obj = ad.get("price") or {}
        price = None
        if isinstance(price_obj, dict):
            price = (price_obj.get("regularPrice") or {}).get("value")
        if price is None and isinstance(price_obj, (int, float)):
            price = price_obj
        try:
            price = float(price) if price is not None else None
        except (TypeError, ValueError):
            price = None
        if price and price >= 100:
            listing.price = fv(price, "structured")

        # params: list of {key, name, value|normalizedValue}
        for p in ad.get("params", []) or []:
            key = str(p.get("key", "")).lower()
            val = p.get("normalizedValue") or p.get("value") or ""
            if isinstance(val, dict):
                val = val.get("label") or val.get("key") or ""
            val = str(val)
            if key in ("m", "powierzchnia", "area"):
                if size := parse_size(f"{val} m²"):
                    listing.size = fv(size, "structured")
            elif "rooms" in key or "pokoi" in key:
                m = re.search(r"\d+", val)
                if m:
                    listing.rooms = fv(int(m.group()), "structured")
            elif "czynsz" in key or key == "rent":
                if rent := parse_price(f"{val} zł"):
                    listing.rent_extra = fv(rent, "structured")
            elif "floor" in key or "pietro" in key or "piętro" in key:
                if "parter" in val.lower():
                    listing.floor = fv(0, "structured")
                elif m := re.search(r"\d+", val):
                    listing.floor = fv(int(m.group()), "structured")
            elif "furniture" in key or "umeblowane" in key:
                listing.furnished = fv(val.lower() in ("tak", "yes", "true"), "structured")

        loc = ad.get("location") or {}
        if city := (loc.get("city") or {}).get("name"):
            listing.city = fv(city, "structured")
        if district := (loc.get("district") or {}).get("name"):
            listing.district = fv(district, "structured")
        parts = [p for p in (listing.city and listing.city.value,
                             listing.district and listing.district.value) if p]
        if parts:
            listing.address = fv(", ".join(parts), "structured")

        map_info = ad.get("map") or {}
        lat, lng = map_info.get("lat"), map_info.get("lon")
        if lat and lng:
            listing.coordinates = fv(
                Coordinates(latitude=float(lat), longitude=float(lng)), "structured"
            )
            # OLX pins are often zoomed-out approximations; radius>0 means inexact
            listing.geo_precision = (
                GeoPrecision.EXACT if not map_info.get("radius") else GeoPrecision.DISTRICT
            )

        photos = ad.get("photos") or []
        images = []
        for ph in photos:
            u = ph if isinstance(ph, str) else (ph.get("link") or "")
            if u:
                images.append(u.replace("{width}", "1024").replace("{height}", "768"))
        if images:
            listing.images = fv(images, "structured")

        if (biz := ad.get("business")) is not None:
            listing.offered_by = fv(
                OfferedBy.AGENCY if biz else OfferedBy.OWNER, "structured"
            )

        if created := ad.get("createdTime"):
            try:
                listing.posted_at = fv(
                    datetime.fromisoformat(str(created).replace("Z", "+00:00")),
                    "structured",
                )
            except ValueError:
                pass

        if contact_phone := (ad.get("contact") or {}).get("phone"):
            if isinstance(contact_phone, str) and not set(contact_phone) <= {"*", "+"}:
                listing.phone = fv(contact_phone, "structured")

        return listing

    # ---- source 2: JSON-LD ---------------------------------------------------

    def _from_json_ld(self, url: str, html: str) -> ExtractedListing | None:
        soup = BeautifulSoup(html, "lxml")
        for script in soup.select("script[type='application/ld+json']"):
            try:
                data = json.loads(script.string or "")
            except json.JSONDecodeError:
                continue
            if not isinstance(data, dict) or data.get("@type") not in ("Product", "Offer"):
                continue
            listing = ExtractedListing(
                source_url=url,
                source_site="olx",
                source_id=self._id_from_url(url),
            )
            if name := data.get("name"):
                listing.title = fv(clean_text(name), "structured")
            if desc := data.get("description"):
                listing.description_pl = fv(clean_text(desc), "structured")
            offers = data.get("offers") or {}
            price = offers.get("price")
            try:
                price = float(price) if price is not None else None
            except (TypeError, ValueError):
                price = None
            if price and price >= 100:
                listing.price = fv(price, "structured")
            imgs = data.get("image")
            if isinstance(imgs, str):
                imgs = [imgs]
            if imgs:
                listing.images = fv(list(imgs), "structured")
            return listing
        return None

    # ---- source 3: CSS fallback ----------------------------------------------

    def _from_css(self, url: str, html: str) -> ExtractedListing | None:
        soup = BeautifulSoup(html, "lxml")
        title_el = soup.select_one("[data-cy='ad_title'], h1")
        if not title_el:
            return None
        listing = ExtractedListing(
            source_url=url, source_site="olx", source_id=self._id_from_url(url)
        )
        listing.title = fv(clean_text(title_el.get_text()), "structured")

        price_el = soup.select_one(
            "[data-testid='ad-price-container'] h3, [data-cy='ad_price']"
        )
        if price_el and (price := parse_price(price_el.get_text())):
            listing.price = fv(price, "structured")

        if desc_el := soup.select_one("[data-cy='ad_description']"):
            listing.description_pl = fv(clean_text(desc_el.get_text()), "structured")

        images = []
        for img in soup.select("[data-cy='ad-photo-swiper'] img, [class*='swiper'] img"):
            src = img.get("src") or img.get("data-src")
            if src and src.startswith("http") and "placeholder" not in src.lower():
                src = re.sub(r";s=\d+x\d+", ";s=1024x768", src)
                if src not in images:
                    images.append(src)
        if images:
            listing.images = fv(images, "structured")

        for param in soup.select("[data-testid='ad-params-container'] li"):
            text = param.get_text().lower()
            if "powierzchnia" in text or "m²" in text:
                if size := parse_size(text):
                    listing.size = fv(size, "structured")
            elif "pokoi" in text or "pokoje" in text:
                if m := re.search(r"\d+", text):
                    listing.rooms = fv(int(m.group()), "structured")

        return listing

    @staticmethod
    def _id_from_url(url: str) -> str:
        m = re.search(r"ID([a-zA-Z0-9]+)", url)
        return m.group(1) if m else url.rstrip("/").rsplit("/", 1)[-1][:40]
