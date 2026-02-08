"""OLX.pl scraper implementation."""

import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from src.models import ScrapedListing
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class OLXScraper(BaseScraper):
    """Scraper for OLX.pl rental listings."""

    SITE_NAME = "olx"
    SELECTORS_FILE = "olx.yaml"
    BASE_URL = "https://www.olx.pl"

    # City name mappings (Polish to URL slug)
    CITY_SLUGS = {
        "warszawa": "warszawa",
        "krakow": "krakow",
        "wroclaw": "wroclaw",
        "poznan": "poznan",
        "gdansk": "gdansk",
        "lodz": "lodz",
        "szczecin": "szczecin",
        "katowice": "katowice",
        "lublin": "lublin",
        "bialystok": "bialystok",
    }

    def get_search_url(self, city: str, page: int = 1) -> str:
        """Build OLX search URL."""
        city_slug = self.CITY_SLUGS.get(city.lower(), city.lower())
        base = f"{self.BASE_URL}/nieruchomosci/mieszkania/wynajem/{city_slug}/"

        params = []
        if page > 1:
            params.append(f"page={page}")
        params.append("search[order]=created_at:desc")

        if params:
            return f"{base}?{'&'.join(params)}"
        return base

    async def extract_listing_urls(self, html: str) -> list[str]:
        """Extract listing URLs from OLX search results."""
        soup = BeautifulSoup(html, "lxml")
        urls = []

        # Find listing cards
        cards = soup.select("[data-cy='l-card']")

        for card in cards:
            # Find link element
            link = card.select_one("a[data-cy='ad-card-title']")
            if not link:
                link = card.select_one("a")

            if link and link.get("href"):
                url = link["href"]
                # Ensure absolute URL
                if not url.startswith("http"):
                    url = urljoin(self.BASE_URL, url)

                # Skip promoted external listings
                if "olx.pl" in url:
                    urls.append(url)

        logger.debug(f"Found {len(urls)} listing URLs on OLX search page")
        return urls

    async def extract_listing_data(self, url: str, html: str) -> Optional[ScrapedListing]:
        """Extract listing data from OLX detail page."""
        soup = BeautifulSoup(html, "lxml")

        try:
            # Extract title
            title_elem = soup.select_one("[data-cy='ad_title']")
            title = self._clean_text(title_elem.get_text()) if title_elem else ""

            if not title:
                logger.warning(f"No title found for {url}")
                return None

            # Extract price
            price_elem = soup.select_one("[data-testid='ad-price-container'] h3")
            if not price_elem:
                price_elem = soup.select_one("[data-cy='ad_price']")
            price_text = price_elem.get_text() if price_elem else ""
            price = self._extract_price(price_text)

            if not price or price < 100:
                logger.warning(f"Invalid price for {url}: {price_text}")
                return None

            # Extract description
            desc_elem = soup.select_one("[data-cy='ad_description'] div")
            if not desc_elem:
                desc_elem = soup.select_one("[data-cy='ad_description']")
            description = self._clean_text(desc_elem.get_text()) if desc_elem else ""

            # Extract location
            location_elem = soup.select_one("[data-testid='map-link'] p")
            if not location_elem:
                # Try breadcrumb location
                location_elem = soup.select_one("[data-cy='ad_breadcrumb']")
            address = self._clean_text(location_elem.get_text()) if location_elem else ""

            # Extract city from address or URL
            city = self._extract_city(url, address)

            # Extract images
            image_urls = self._extract_images(soup)

            # Extract attributes
            attributes = self._extract_attributes(soup)

            # Extract size and rooms from attributes
            size = attributes.get("size")
            if size:
                size = self._extract_size(str(size))
            rooms = attributes.get("rooms")
            if rooms:
                rooms = self._extract_rooms(str(rooms))

            # Extract listing ID
            source_id = self._extract_id_from_url(url)

            # Check for promotion badge
            is_promoted = bool(soup.select_one("[data-testid='ad-badge']"))

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
                is_promoted=is_promoted,
                scraped_at=datetime.utcnow(),
            )

        except Exception as e:
            logger.error(f"Error extracting OLX listing {url}: {e}")
            return None

    def _extract_images(self, soup: BeautifulSoup) -> list[str]:
        """Extract image URLs from listing page."""
        images = []

        # Try swiper container
        swiper = soup.select_one("[data-cy='ad-photo-swiper']")
        if swiper:
            for img in swiper.select("img"):
                src = img.get("src") or img.get("data-src")
                if src and self._is_valid_image_url(src):
                    images.append(src)

        # Try gallery images
        if not images:
            for img in soup.select("img[src*='img']"):
                src = img.get("src")
                if src and self._is_valid_image_url(src):
                    images.append(src)

        # Remove duplicates while preserving order
        seen = set()
        unique_images = []
        for url in images:
            # Normalize URL for comparison
            normalized = url.split("?")[0]
            if normalized not in seen:
                seen.add(normalized)
                unique_images.append(url)

        return unique_images[:10]  # Limit to 10 images

    def _is_valid_image_url(self, url: str) -> bool:
        """Check if URL is a valid listing image."""
        if not url:
            return False

        # Skip thumbnails and icons
        skip_patterns = ["icon", "logo", "avatar", "placeholder", "loading"]
        url_lower = url.lower()
        if any(pattern in url_lower for pattern in skip_patterns):
            return False

        # Check for image extensions or CDN patterns
        if any(ext in url_lower for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            return True
        if any(cdn in url_lower for cdn in ["olx", "images", "img", "photo"]):
            return True

        return False

    def _extract_attributes(self, soup: BeautifulSoup) -> dict:
        """Extract listing attributes/properties."""
        attributes = {}

        # Find parameters container
        params_container = soup.select_one("[data-testid='ad-params-container']")
        if not params_container:
            params_container = soup.select_one(".css-1r0si1e")  # Fallback class

        if params_container:
            # OLX uses list items for parameters
            for item in params_container.select("li"):
                paragraphs = item.select("p")
                if len(paragraphs) >= 2:
                    label = self._clean_text(paragraphs[0].get_text())
                    value = self._clean_text(paragraphs[1].get_text())

                    # Map Polish labels to English keys
                    key = self._map_attribute_label(label)
                    if key:
                        attributes[key] = value

        return attributes

    def _map_attribute_label(self, label: str) -> Optional[str]:
        """Map Polish attribute label to English key."""
        mappings = {
            "powierzchnia": "size",
            "liczba pokoi": "rooms",
            "poziom": "floor",
            "umeblowane": "furnished",
            "rodzaj zabudowy": "building_type",
            "czynsz": "additional_rent",
            "kaucja": "deposit",
            "dostępne od": "available_from",
        }

        label_lower = label.lower().strip()
        return mappings.get(label_lower)

    def _extract_city(self, url: str, address: str) -> str:
        """Extract city name from URL or address."""
        # Try to extract from URL
        for city, slug in self.CITY_SLUGS.items():
            if slug in url.lower():
                return city.capitalize()

        # Try to extract from address
        address_lower = address.lower()
        for city in self.CITY_SLUGS.keys():
            if city in address_lower:
                return city.capitalize()

        # Default to first part of address
        if "," in address:
            return address.split(",")[0].strip()

        return address.split()[0] if address else "Unknown"
