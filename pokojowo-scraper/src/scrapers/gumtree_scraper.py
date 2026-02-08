"""Gumtree.pl scraper implementation."""

import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from src.models import ScrapedListing
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class GumtreeScraper(BaseScraper):
    """Scraper for Gumtree.pl rental listings."""

    SITE_NAME = "gumtree"
    SELECTORS_FILE = "gumtree.yaml"
    BASE_URL = "https://www.gumtree.pl"

    # City location codes for Gumtree
    CITY_CODES = {
        "warszawa": "l3200208",
        "krakow": "l3200210",
        "wroclaw": "l3200216",
        "poznan": "l3200212",
        "gdansk": "l3200206",
        "lodz": "l3200211",
        "szczecin": "l3200215",
        "katowice": "l3200209",
        "lublin": "l3200214",
        "bialystok": "l3200205",
    }

    def get_search_url(self, city: str, page: int = 1) -> str:
        """Build Gumtree search URL."""
        city_lower = city.lower()
        city_code = self.CITY_CODES.get(city_lower, "l3200208")  # Default to Warsaw

        # Gumtree category for "Mieszkania i domy do wynajęcia" (rental apartments/houses)
        category = "s-mieszkania-i-domy-do-wynajecia"

        base = f"{self.BASE_URL}/{category}/{city_lower}/v1c9008{city_code}"

        params = ["o=sort_by_date"]  # Sort by newest
        if page > 1:
            params.append(f"page={page}")

        return f"{base}?{'&'.join(params)}"

    async def extract_listing_urls(self, html: str) -> list[str]:
        """Extract listing URLs from Gumtree search results."""
        soup = BeautifulSoup(html, "lxml")
        urls = []

        # Find listing tiles
        tiles = soup.select(".tileV1")
        if not tiles:
            tiles = soup.select("[data-q='tile']")
        if not tiles:
            tiles = soup.select(".results .result")

        for tile in tiles:
            # Find the main link
            link = tile.select_one(".tile-link")
            if not link:
                link = tile.select_one("a.title")
            if not link:
                link = tile.select_one("a[href*='/a-']")

            if link and link.get("href"):
                url = link["href"]
                if not url.startswith("http"):
                    url = urljoin(self.BASE_URL, url)

                # Only include actual listings (not ads or promoted external)
                if "gumtree.pl" in url and "/a-" in url:
                    urls.append(url)

        logger.debug(f"Found {len(urls)} listing URLs on Gumtree search page")
        return urls

    async def extract_listing_data(self, url: str, html: str) -> Optional[ScrapedListing]:
        """Extract listing data from Gumtree detail page."""
        soup = BeautifulSoup(html, "lxml")

        try:
            # Extract title
            title_elem = soup.select_one(".vip-title h1")
            if not title_elem:
                title_elem = soup.select_one("[data-q='ad-title']")
            if not title_elem:
                title_elem = soup.select_one("h1")
            title = self._clean_text(title_elem.get_text()) if title_elem else ""

            if not title:
                logger.warning(f"No title found for {url}")
                return None

            # Extract price
            price_elem = soup.select_one(".vip-price .price")
            if not price_elem:
                price_elem = soup.select_one("[data-q='ad-price']")
            if not price_elem:
                price_elem = soup.select_one(".ad-price")
            price_text = price_elem.get_text() if price_elem else ""
            price = self._extract_price(price_text)

            if not price or price < 100:
                logger.warning(f"Invalid price for {url}: {price_text}")
                return None

            # Extract description
            desc_elem = soup.select_one(".vip-content-description")
            if not desc_elem:
                desc_elem = soup.select_one("[data-q='ad-description']")
            if not desc_elem:
                desc_elem = soup.select_one(".description")
            description = self._clean_text(desc_elem.get_text()) if desc_elem else ""

            # Extract location
            location_elem = soup.select_one(".vip-location")
            if not location_elem:
                location_elem = soup.select_one("[data-q='ad-location']")
            if not location_elem:
                location_elem = soup.select_one(".location")
            address = self._clean_text(location_elem.get_text()) if location_elem else ""

            # Extract city from URL or address
            city = self._extract_city(url, address)

            # Extract images
            image_urls = self._extract_images(soup)

            # Extract attributes
            attributes = self._extract_attributes(soup)

            # Get size and rooms from attributes
            size = None
            if "size" in attributes:
                size = self._extract_size(str(attributes["size"]))
            rooms = None
            if "rooms" in attributes:
                rooms = self._extract_rooms(str(attributes["rooms"]))

            # Extract listing ID from URL
            source_id = self._extract_id_from_url(url)

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
                image_urls=image_urls,
                attributes=attributes,
                scraped_at=datetime.utcnow(),
            )

        except Exception as e:
            logger.error(f"Error extracting Gumtree listing {url}: {e}")
            return None

    def _extract_images(self, soup: BeautifulSoup) -> list[str]:
        """Extract image URLs from listing page."""
        images = []

        # Try gallery container
        gallery = soup.select_one(".vip-gallery")
        if not gallery:
            gallery = soup.select_one("[data-q='gallery']")
        if not gallery:
            gallery = soup.select_one(".gallery")

        if gallery:
            for img in gallery.select("img"):
                src = img.get("src") or img.get("data-src")
                if src and self._is_valid_image(src):
                    # Get full-size image if available
                    src = self._get_full_image_url(src)
                    images.append(src)

        # Fallback: try to find any listing images
        if not images:
            for img in soup.select("img[src*='img.gumtree']"):
                src = img.get("src")
                if src and self._is_valid_image(src):
                    images.append(src)

        # Remove duplicates
        seen = set()
        unique_images = []
        for url in images:
            normalized = url.split("?")[0]
            if normalized not in seen:
                seen.add(normalized)
                unique_images.append(url)

        return unique_images[:10]

    def _is_valid_image(self, url: str) -> bool:
        """Check if URL is a valid listing image."""
        if not url:
            return False

        skip_patterns = ["logo", "icon", "avatar", "placeholder", "thumb_small"]
        url_lower = url.lower()
        if any(pattern in url_lower for pattern in skip_patterns):
            return False

        return True

    def _get_full_image_url(self, url: str) -> str:
        """Convert thumbnail URL to full-size image URL."""
        # Gumtree uses patterns like /thumb/large/ or /thumb/medium/
        # Convert to full size
        url = re.sub(r"/thumb/[^/]+/", "/images/", url)
        url = re.sub(r"\?.*$", "", url)  # Remove query params
        return url

    def _extract_attributes(self, soup: BeautifulSoup) -> dict:
        """Extract listing attributes."""
        attributes = {}

        # Find details container
        details = soup.select_one(".vip-details")
        if not details:
            details = soup.select_one("[data-q='ad-details']")
        if not details:
            details = soup.select_one(".details")

        if details:
            for attr in details.select(".attribute"):
                label_elem = attr.select_one(".attribute-label")
                value_elem = attr.select_one(".attribute-value")

                if label_elem and value_elem:
                    label = self._clean_text(label_elem.get_text())
                    value = self._clean_text(value_elem.get_text())

                    key = self._map_attribute_label(label)
                    if key:
                        attributes[key] = value

        # Try alternative attribute structure
        if not attributes:
            for item in soup.select("[class*='attribute']"):
                text = item.get_text()
                if ":" in text:
                    parts = text.split(":", 1)
                    if len(parts) == 2:
                        label = parts[0].strip()
                        value = parts[1].strip()
                        key = self._map_attribute_label(label)
                        if key:
                            attributes[key] = value

        return attributes

    def _map_attribute_label(self, label: str) -> Optional[str]:
        """Map Polish attribute label to English key."""
        mappings = {
            "powierzchnia": "size",
            "powierzchnia (m2)": "size",
            "liczba pokoi": "rooms",
            "liczba łazienek": "bathrooms",
            "do zamieszkania od": "available_from",
            "rodzaj nieruchomości": "property_type",
            "na parterze": "ground_floor",
            "parking": "parking",
            "umeblowanie": "furnished",
            "dla palących": "smoking_allowed",
            "przyjazne zwierzętom": "pets_allowed",
        }

        label_lower = label.lower().strip()
        return mappings.get(label_lower)

    def _extract_city(self, url: str, address: str) -> str:
        """Extract city name from URL or address."""
        # Try URL
        for city in self.CITY_CODES.keys():
            if city in url.lower():
                return city.capitalize()

        # Try address
        address_lower = address.lower()
        for city in self.CITY_CODES.keys():
            if city in address_lower:
                return city.capitalize()

        return "Unknown"

    def _extract_id_from_url(self, url: str) -> str:
        """Extract Gumtree listing ID from URL."""
        # Gumtree URLs have format: /a-kategoria/miasto/tytul/ID123456
        match = re.search(r"/([A-Z0-9]+)(?:\?|$)", url)
        if match:
            return match.group(1)

        # Fallback
        match = re.search(r"(\d+)", url.split("/")[-1])
        if match:
            return match.group(1)

        return super()._extract_id_from_url(url)
