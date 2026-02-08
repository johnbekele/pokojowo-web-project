"""Otodom.pl scraper implementation."""

import json
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from src.models import ScrapedListing
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class OtodomScraper(BaseScraper):
    """Scraper for Otodom.pl rental listings."""

    SITE_NAME = "otodom"
    SELECTORS_FILE = "otodom.yaml"
    BASE_URL = "https://www.otodom.pl"

    # Voivodeship and city mappings
    CITY_DATA = {
        "warszawa": {"voivodeship": "mazowieckie", "slug": "warszawa"},
        "krakow": {"voivodeship": "malopolskie", "slug": "krakow"},
        "wroclaw": {"voivodeship": "dolnoslaskie", "slug": "wroclaw"},
        "poznan": {"voivodeship": "wielkopolskie", "slug": "poznan"},
        "gdansk": {"voivodeship": "pomorskie", "slug": "gdansk"},
        "lodz": {"voivodeship": "lodzkie", "slug": "lodz"},
        "szczecin": {"voivodeship": "zachodniopomorskie", "slug": "szczecin"},
        "katowice": {"voivodeship": "slaskie", "slug": "katowice"},
        "lublin": {"voivodeship": "lubelskie", "slug": "lublin"},
        "bialystok": {"voivodeship": "podlaskie", "slug": "bialystok"},
    }

    def get_search_url(self, city: str, page: int = 1) -> str:
        """Build Otodom search URL."""
        city_lower = city.lower()
        city_data = self.CITY_DATA.get(city_lower, {"voivodeship": city_lower, "slug": city_lower})

        voivodeship = city_data["voivodeship"]
        city_slug = city_data["slug"]

        base = f"{self.BASE_URL}/pl/wyniki/wynajem/mieszkanie/{voivodeship}/{city_slug}"

        params = ["by=LATEST"]
        if page > 1:
            params.append(f"page={page}")

        return f"{base}?{'&'.join(params)}"

    async def extract_listing_urls(self, html: str) -> list[str]:
        """Extract listing URLs from Otodom search results."""
        soup = BeautifulSoup(html, "lxml")
        urls = []

        # Try to extract from Next.js data
        script_data = self._extract_next_data(soup)
        if script_data:
            urls = self._extract_urls_from_json(script_data)
            if urls:
                logger.debug(f"Extracted {len(urls)} URLs from JSON data")
                return urls

        # Fallback to HTML parsing
        cards = soup.select("[data-cy='listing-item']")
        if not cards:
            cards = soup.select("article[data-cy]")

        for card in cards:
            link = card.select_one("[data-cy='listing-item-link']")
            if not link:
                link = card.select_one("a")

            if link and link.get("href"):
                url = link["href"]
                if not url.startswith("http"):
                    url = urljoin(self.BASE_URL, url)

                if "otodom.pl" in url and "/oferta/" in url:
                    urls.append(url)

        logger.debug(f"Found {len(urls)} listing URLs on Otodom search page")
        return urls

    def _extract_next_data(self, soup: BeautifulSoup) -> Optional[dict]:
        """Extract Next.js __NEXT_DATA__ JSON."""
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                return json.loads(script.string)
            except json.JSONDecodeError:
                pass
        return None

    def _extract_urls_from_json(self, data: dict) -> list[str]:
        """Extract listing URLs from Next.js JSON data."""
        urls = []
        try:
            # Navigate to listings in the data structure
            props = data.get("props", {})
            page_props = props.get("pageProps", {})
            search_data = page_props.get("data", {}).get("searchAds", {})
            items = search_data.get("items", [])

            for item in items:
                slug = item.get("slug")
                if slug:
                    url = f"{self.BASE_URL}/pl/oferta/{slug}"
                    urls.append(url)

        except (KeyError, TypeError) as e:
            logger.debug(f"Error extracting URLs from JSON: {e}")

        return urls

    async def extract_listing_data(self, url: str, html: str) -> Optional[ScrapedListing]:
        """Extract listing data from Otodom detail page."""
        soup = BeautifulSoup(html, "lxml")

        # Try to extract from Next.js data first
        json_data = self._extract_listing_json(soup)

        try:
            if json_data:
                return self._parse_json_listing(url, json_data)
            else:
                return self._parse_html_listing(url, soup)

        except Exception as e:
            logger.error(f"Error extracting Otodom listing {url}: {e}")
            return None

    def _extract_listing_json(self, soup: BeautifulSoup) -> Optional[dict]:
        """Extract listing data from JSON-LD or Next.js data."""
        # Try JSON-LD
        for script in soup.select('script[type="application/ld+json"]'):
            if script.string:
                try:
                    data = json.loads(script.string)
                    if data.get("@type") == "Product" or "offers" in data:
                        return data
                except json.JSONDecodeError:
                    continue

        # Try Next.js data
        next_data = self._extract_next_data(soup)
        if next_data:
            try:
                ad_data = next_data.get("props", {}).get("pageProps", {}).get("ad")
                if ad_data:
                    return ad_data
            except (KeyError, TypeError):
                pass

        return None

    def _parse_json_listing(self, url: str, data: dict) -> Optional[ScrapedListing]:
        """Parse listing from JSON data."""
        title = data.get("title", "") or data.get("name", "")
        description = data.get("description", "")

        # Price
        price = None
        if "offers" in data:
            price = data["offers"].get("price")
        if not price:
            price = data.get("price", {}).get("value") or data.get("totalPrice", {}).get("value")
        price = float(price) if price else None

        # Address
        location = data.get("location", {})
        address_parts = []
        if location.get("address", {}).get("street"):
            address_parts.append(location["address"]["street"])
        if location.get("address", {}).get("city"):
            address_parts.append(location["address"]["city"])
        address = ", ".join(address_parts) if address_parts else data.get("location", {}).get("address", {}).get("value", "")

        city = location.get("address", {}).get("city", {}).get("name", "")
        if not city:
            city = self._extract_city_from_url(url)

        # Size
        characteristics = data.get("characteristics", [])
        size = None
        rooms = None
        for char in characteristics:
            key = char.get("key", "")
            if key == "m" or key == "area":
                size = float(char.get("value", 0))
            elif key == "rooms_num":
                rooms = int(char.get("value", 0))

        if not size:
            size = data.get("areaInM2")

        # Images
        images = data.get("images", [])
        image_urls = []
        for img in images:
            if isinstance(img, dict):
                img_url = img.get("large") or img.get("medium") or img.get("small")
            else:
                img_url = img
            if img_url:
                image_urls.append(img_url)

        # Source ID
        source_id = str(data.get("id", "")) or self._extract_id_from_url(url)

        if not title or not price:
            return None

        return ScrapedListing(
            source_site=self.SITE_NAME,
            source_url=url,
            source_id=source_id,
            title=title,
            description=description,
            price=price,
            address=address,
            city=city,
            size=size,
            rooms=rooms,
            image_urls=image_urls[:10],
            attributes={"raw_data": data.get("characteristics", [])},
            scraped_at=datetime.utcnow(),
        )

    def _parse_html_listing(self, url: str, soup: BeautifulSoup) -> Optional[ScrapedListing]:
        """Parse listing from HTML (fallback)."""
        # Title
        title_elem = soup.select_one("[data-cy='adPageAdTitle']")
        if not title_elem:
            title_elem = soup.select_one("h1")
        title = self._clean_text(title_elem.get_text()) if title_elem else ""

        # Price
        price_elem = soup.select_one("[data-cy='adPageHeaderPrice']")
        if not price_elem:
            price_elem = soup.select_one("[aria-label='Cena']")
        price_text = price_elem.get_text() if price_elem else ""
        price = self._extract_price(price_text)

        # Description
        desc_elem = soup.select_one("[data-cy='adPageAdDescription']")
        description = self._clean_text(desc_elem.get_text()) if desc_elem else ""

        # Address
        address_elem = soup.select_one("[aria-label='Adres']")
        if not address_elem:
            address_elem = soup.select_one("[data-cy='adPageAdLocation']")
        address = self._clean_text(address_elem.get_text()) if address_elem else ""

        city = self._extract_city_from_url(url)

        # Images
        image_urls = []
        gallery = soup.select_one("[data-cy='gallery-pictures-container']")
        if gallery:
            for img in gallery.select("img"):
                src = img.get("src") or img.get("data-src")
                if src and "otodom" in src:
                    image_urls.append(src)

        # Size
        size = None
        size_elem = soup.select_one("[data-testid='table-value-area']")
        if size_elem:
            size = self._extract_size(size_elem.get_text())

        # Rooms
        rooms = None
        rooms_elem = soup.select_one("[data-testid='table-value-rooms_num']")
        if rooms_elem:
            rooms = self._extract_rooms(rooms_elem.get_text())

        source_id = self._extract_id_from_url(url)

        if not title or not price:
            return None

        return ScrapedListing(
            source_site=self.SITE_NAME,
            source_url=url,
            source_id=source_id,
            title=title,
            description=description,
            price=price,
            address=address,
            city=city,
            size=size,
            rooms=rooms,
            image_urls=image_urls[:10],
            attributes={},
            scraped_at=datetime.utcnow(),
        )

    def _extract_city_from_url(self, url: str) -> str:
        """Extract city name from Otodom URL."""
        for city, data in self.CITY_DATA.items():
            if data["slug"] in url.lower():
                return city.capitalize()
        return "Unknown"
