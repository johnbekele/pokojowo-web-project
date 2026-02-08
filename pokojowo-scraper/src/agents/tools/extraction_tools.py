"""Extraction tools for parsing listing data."""

import logging
import re
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup

from src.models import ScrapedListing, ProcessedListing, BilingualText
from src.models.processed_listing import RoomType, BuildingType, RentFor

logger = logging.getLogger(__name__)


class ExtractionTools:
    """Tools for extracting and classifying listing data."""

    async def extract_listing_data(self, url: str, html: str, site: str) -> dict:
        """Extract structured listing data from HTML.

        Parses the HTML of a listing detail page and extracts all relevant
        information like title, price, description, images, etc.

        Args:
            url: The listing URL
            html: HTML content of the listing page
            site: Source site name (olx, otodom, gumtree)

        Returns:
            Dictionary with extracted listing data or error
        """
        try:
            soup = BeautifulSoup(html, "lxml")

            if site == "olx":
                return self._extract_olx(url, soup)
            elif site == "otodom":
                return self._extract_otodom(url, soup)
            elif site == "gumtree":
                return self._extract_gumtree(url, soup)
            else:
                return {"success": False, "error": f"Unknown site: {site}"}

        except Exception as e:
            logger.error(f"Extraction error for {url}: {e}")
            return {"success": False, "error": str(e)}

    def _extract_olx(self, url: str, soup: BeautifulSoup) -> dict:
        """Extract data from OLX listing."""
        data = {"success": True, "site": "olx", "url": url}

        # Title
        title_elem = soup.select_one("[data-cy='ad_title']")
        data["title"] = self._clean(title_elem.get_text()) if title_elem else ""

        # Price
        price_elem = soup.select_one("[data-testid='ad-price-container'] h3")
        if not price_elem:
            price_elem = soup.select_one("[data-cy='ad_price']")
        data["price"] = self._extract_price(price_elem.get_text() if price_elem else "")

        # Description
        desc_elem = soup.select_one("[data-cy='ad_description'] div")
        data["description"] = self._clean(desc_elem.get_text()) if desc_elem else ""

        # Location
        loc_elem = soup.select_one("[data-testid='map-link'] p")
        data["address"] = self._clean(loc_elem.get_text()) if loc_elem else ""

        # Images
        data["images"] = self._extract_images(soup, "olx")

        # Attributes
        data["attributes"] = self._extract_attributes(soup, "olx")

        return data

    def _extract_otodom(self, url: str, soup: BeautifulSoup) -> dict:
        """Extract data from Otodom listing."""
        data = {"success": True, "site": "otodom", "url": url}

        # Title
        title_elem = soup.select_one("[data-cy='adPageAdTitle']")
        if not title_elem:
            title_elem = soup.select_one("h1")
        data["title"] = self._clean(title_elem.get_text()) if title_elem else ""

        # Price
        price_elem = soup.select_one("[data-cy='adPageHeaderPrice']")
        data["price"] = self._extract_price(price_elem.get_text() if price_elem else "")

        # Description
        desc_elem = soup.select_one("[data-cy='adPageAdDescription']")
        data["description"] = self._clean(desc_elem.get_text()) if desc_elem else ""

        # Address
        addr_elem = soup.select_one("[aria-label='Adres']")
        data["address"] = self._clean(addr_elem.get_text()) if addr_elem else ""

        # Images
        data["images"] = self._extract_images(soup, "otodom")

        # Attributes
        data["attributes"] = self._extract_attributes(soup, "otodom")

        return data

    def _extract_gumtree(self, url: str, soup: BeautifulSoup) -> dict:
        """Extract data from Gumtree listing."""
        data = {"success": True, "site": "gumtree", "url": url}

        # Title
        title_elem = soup.select_one(".vip-title h1")
        if not title_elem:
            title_elem = soup.select_one("h1")
        data["title"] = self._clean(title_elem.get_text()) if title_elem else ""

        # Price
        price_elem = soup.select_one(".vip-price .price")
        if not price_elem:
            price_elem = soup.select_one(".ad-price")
        data["price"] = self._extract_price(price_elem.get_text() if price_elem else "")

        # Description
        desc_elem = soup.select_one(".vip-content-description")
        data["description"] = self._clean(desc_elem.get_text()) if desc_elem else ""

        # Location
        loc_elem = soup.select_one(".vip-location")
        data["address"] = self._clean(loc_elem.get_text()) if loc_elem else ""

        # Images
        data["images"] = self._extract_images(soup, "gumtree")

        # Attributes
        data["attributes"] = self._extract_attributes(soup, "gumtree")

        return data

    def _extract_images(self, soup: BeautifulSoup, site: str) -> list[str]:
        """Extract image URLs from listing."""
        images = []

        if site == "olx":
            container = soup.select_one("[data-cy='ad-photo-swiper']")
            if container:
                for img in container.select("img"):
                    src = img.get("src") or img.get("data-src")
                    if src and "olx" in src:
                        images.append(src)

        elif site == "otodom":
            container = soup.select_one("[data-cy='gallery-pictures-container']")
            if container:
                for img in container.select("img"):
                    src = img.get("src") or img.get("data-src")
                    if src:
                        images.append(src)

        elif site == "gumtree":
            container = soup.select_one(".vip-gallery")
            if container:
                for img in container.select("img"):
                    src = img.get("src") or img.get("data-src")
                    if src:
                        images.append(src)

        return images[:10]

    def _extract_attributes(self, soup: BeautifulSoup, site: str) -> dict:
        """Extract listing attributes."""
        attrs = {}

        if site == "olx":
            container = soup.select_one("[data-testid='ad-params-container']")
            if container:
                for li in container.select("li"):
                    ps = li.select("p")
                    if len(ps) >= 2:
                        key = self._clean(ps[0].get_text()).lower()
                        value = self._clean(ps[1].get_text())
                        attrs[key] = value

        elif site == "otodom":
            for elem in soup.select("[data-testid^='table-value']"):
                testid = elem.get("data-testid", "")
                key = testid.replace("table-value-", "")
                value = self._clean(elem.get_text())
                if key and value:
                    attrs[key] = value

        elif site == "gumtree":
            for attr in soup.select(".attribute"):
                label = attr.select_one(".attribute-label")
                value = attr.select_one(".attribute-value")
                if label and value:
                    attrs[self._clean(label.get_text()).lower()] = self._clean(value.get_text())

        return attrs

    async def classify_room_type(self, rooms: Optional[int], size: Optional[float]) -> dict:
        """Classify room type based on number of rooms and size.

        Maps the listing to Pokojowo's room types: Single, Double, Suite.

        Args:
            rooms: Number of rooms in the listing
            size: Size in square meters

        Returns:
            Dictionary with room_type classification
        """
        if rooms is None and size is None:
            return {"room_type": RoomType.DOUBLE.value, "confidence": "low"}

        # Single: Studio/1 room or small spaces
        if rooms == 1 or (size and size < 35):
            return {"room_type": RoomType.SINGLE.value, "confidence": "high"}

        # Suite: 3+ rooms or large spaces
        if (rooms and rooms >= 3) or (size and size > 70):
            return {"room_type": RoomType.SUITE.value, "confidence": "high"}

        # Double: Default for 2 rooms or medium spaces
        return {"room_type": RoomType.DOUBLE.value, "confidence": "high"}

    async def classify_building_type(self, text: str, attributes: dict) -> dict:
        """Classify building type from listing text and attributes.

        Maps to Pokojowo's building types: Apartment, Loft, Block, Detached_House.

        Args:
            text: Combined title and description text
            attributes: Extracted listing attributes

        Returns:
            Dictionary with building_type classification
        """
        text_lower = text.lower()
        attr_type = attributes.get("rodzaj zabudowy", "").lower()
        attr_type = attr_type or attributes.get("building_type", "").lower()

        # Check for Loft
        if "loft" in text_lower or "loft" in attr_type:
            return {"building_type": BuildingType.LOFT.value, "confidence": "high"}

        # Check for Detached House
        house_keywords = ["dom", "house", "wolnostojący", "jednorodzinny", "detached"]
        if any(kw in text_lower or kw in attr_type for kw in house_keywords):
            return {"building_type": BuildingType.DETACHED_HOUSE.value, "confidence": "high"}

        # Check for Block (typical Polish "blok")
        block_keywords = ["blok", "block", "wieżowiec", "wielorodzinny"]
        if any(kw in text_lower or kw in attr_type for kw in block_keywords):
            return {"building_type": BuildingType.BLOCK.value, "confidence": "high"}

        # Check for Apartment
        apt_keywords = ["apartament", "apartment", "kamienica", "mieszkanie"]
        if any(kw in text_lower or kw in attr_type for kw in apt_keywords):
            return {"building_type": BuildingType.APARTMENT.value, "confidence": "high"}

        # Default to Apartment (most common in Polish cities)
        return {"building_type": BuildingType.APARTMENT.value, "confidence": "medium"}

    async def determine_rent_for(self, description: str) -> dict:
        """Determine target tenant type from description.

        Analyzes description to identify if listing targets specific tenants.

        Args:
            description: Listing description text

        Returns:
            Dictionary with rent_for_only list
        """
        desc_lower = description.lower()
        rent_for = []

        # Check for specific tenant preferences
        if any(w in desc_lower for w in ["student", "studentka", "studenci"]):
            rent_for.append(RentFor.STUDENT.value)

        if any(w in desc_lower for w in ["para", "couple", "małżeństwo"]):
            rent_for.append(RentFor.COUPLE.value)

        if any(w in desc_lower for w in ["rodzina", "family", "dzieci"]):
            rent_for.append(RentFor.FAMILY.value)

        if any(w in desc_lower for w in ["kobieta", "pani", "kobiety", "women only"]):
            rent_for.append(RentFor.WOMEN.value)

        if any(w in desc_lower for w in ["mężczyzna", "pan", "mężczyźni", "men only"]):
            rent_for.append(RentFor.MAN.value)

        # If no specific preference found, open to all
        if not rent_for:
            rent_for = [RentFor.OPEN_TO_ALL.value]

        return {"rent_for_only": rent_for}

    def _clean(self, text: str) -> str:
        """Clean extracted text."""
        if not text:
            return ""
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _extract_price(self, text: str) -> Optional[float]:
        """Extract numeric price from text."""
        if not text:
            return None
        text = text.replace("zł", "").replace("PLN", "")
        text = re.sub(r"\s+", "", text)
        text = text.replace(",", ".")
        match = re.search(r"[\d.]+", text)
        if match:
            try:
                return float(match.group())
            except ValueError:
                return None
        return None


# Tool definitions for Claude API
EXTRACTION_TOOLS = [
    {
        "name": "extract_listing_data",
        "description": """Extract structured data from a listing page HTML.
Parses the HTML and extracts:
- Title
- Price
- Description
- Address
- Images
- Attributes (size, rooms, etc.)

Use this after fetching a listing page with navigate_to_url.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The listing URL"},
                "html": {"type": "string", "description": "HTML content of the listing page"},
                "site": {
                    "type": "string",
                    "enum": ["olx", "otodom", "gumtree"],
                    "description": "Source site name",
                },
            },
            "required": ["url", "html", "site"],
        },
    },
    {
        "name": "classify_room_type",
        "description": """Classify the room type for Pokojowo.
Maps listings to: Single, Double, or Suite based on room count and size.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "rooms": {"type": "integer", "description": "Number of rooms (can be null)"},
                "size": {"type": "number", "description": "Size in m² (can be null)"},
            },
        },
    },
    {
        "name": "classify_building_type",
        "description": """Classify the building type for Pokojowo.
Maps to: Apartment, Loft, Block, or Detached_House.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Title and description text"},
                "attributes": {"type": "object", "description": "Extracted attributes dict"},
            },
            "required": ["text"],
        },
    },
    {
        "name": "determine_rent_for",
        "description": """Determine target tenant type from description.
Identifies if listing targets: Women, Man, Family, Couple, Student, Local, or Open to All.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "description": {"type": "string", "description": "Listing description"},
            },
            "required": ["description"],
        },
    },
]
