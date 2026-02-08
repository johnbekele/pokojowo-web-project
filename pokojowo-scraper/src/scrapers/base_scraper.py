"""Base scraper class with common functionality."""

import asyncio
import logging
import re
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Optional

import httpx
import yaml
from bs4 import BeautifulSoup

from src.config import settings
from src.models import ScrapedListing

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Abstract base class for site scrapers."""

    SITE_NAME: str = ""
    SELECTORS_FILE: str = ""

    def __init__(self):
        self.selectors = self._load_selectors()
        self.rate_limit = settings.rate_limits.get(self.SITE_NAME, 30)
        self._request_interval = 60.0 / self.rate_limit  # seconds between requests
        self._last_request_time: float = 0
        self._client: Optional[httpx.AsyncClient] = None

    def _load_selectors(self) -> dict:
        """Load CSS selectors from YAML file."""
        selectors_path = Path(__file__).parent.parent / "config" / "selectors" / self.SELECTORS_FILE
        if not selectors_path.exists():
            logger.warning(f"Selectors file not found: {selectors_path}")
            return {}

        with open(selectors_path) as f:
            return yaml.safe_load(f)

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
            }
            self._client = httpx.AsyncClient(
                headers=headers,
                timeout=httpx.Timeout(settings.request_timeout),
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _rate_limit_wait(self):
        """Wait to respect rate limits."""
        import time

        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self._request_interval:
            await asyncio.sleep(self._request_interval - elapsed)
        self._last_request_time = time.time()

    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch a page with rate limiting.

        Args:
            url: URL to fetch

        Returns:
            Page HTML or None if failed
        """
        await self._rate_limit_wait()
        client = await self._get_client()

        try:
            response = await client.get(url)
            response.raise_for_status()

            # Check for CAPTCHA
            if self._is_captcha_page(response.text):
                logger.warning(f"CAPTCHA detected on {url}")
                return None

            return response.text

        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None

    def _is_captcha_page(self, html: str) -> bool:
        """Check if page contains CAPTCHA.

        Args:
            html: Page HTML

        Returns:
            True if CAPTCHA detected
        """
        captcha_indicators = [
            "g-recaptcha",
            "captcha",
            "hcaptcha",
            "cf-browser-verification",
            "challenge-running",
        ]
        html_lower = html.lower()
        return any(indicator in html_lower for indicator in captcha_indicators)

    @abstractmethod
    def get_search_url(self, city: str, page: int = 1) -> str:
        """Build search URL for city and page.

        Args:
            city: City name
            page: Page number

        Returns:
            Search URL
        """
        pass

    @abstractmethod
    async def extract_listing_urls(self, html: str) -> list[str]:
        """Extract listing URLs from search results page.

        Args:
            html: Search results HTML

        Returns:
            List of listing URLs
        """
        pass

    @abstractmethod
    async def extract_listing_data(self, url: str, html: str) -> Optional[ScrapedListing]:
        """Extract listing data from detail page.

        Args:
            url: Listing URL
            html: Listing page HTML

        Returns:
            ScrapedListing or None if extraction failed
        """
        pass

    async def scrape_search_page(self, city: str, page: int = 1) -> list[str]:
        """Scrape a search results page for listing URLs.

        Args:
            city: City to search
            page: Page number

        Returns:
            List of listing URLs
        """
        url = self.get_search_url(city, page)
        logger.info(f"Scraping search page: {url}")

        html = await self.fetch_page(url)
        if not html:
            return []

        return await self.extract_listing_urls(html)

    async def scrape_listing(self, url: str) -> Optional[ScrapedListing]:
        """Scrape a single listing.

        Args:
            url: Listing URL

        Returns:
            ScrapedListing or None if failed
        """
        logger.debug(f"Scraping listing: {url}")

        html = await self.fetch_page(url)
        if not html:
            return None

        return await self.extract_listing_data(url, html)

    async def scrape_city(
        self, city: str, max_listings: int = 100, max_pages: int = 10
    ) -> AsyncGenerator[ScrapedListing, None]:
        """Scrape listings from a city.

        Args:
            city: City name
            max_listings: Maximum listings to scrape
            max_pages: Maximum pages to scan

        Yields:
            ScrapedListing objects
        """
        listings_scraped = 0
        all_listing_urls = []

        # Collect listing URLs from search pages
        for page in range(1, max_pages + 1):
            if listings_scraped >= max_listings:
                break

            urls = await self.scrape_search_page(city, page)
            if not urls:
                logger.info(f"No more listings found on page {page}")
                break

            all_listing_urls.extend(urls)
            logger.info(f"Found {len(urls)} listings on page {page}")

            # Stop if we have enough URLs
            if len(all_listing_urls) >= max_listings:
                break

        # Scrape individual listings
        for url in all_listing_urls[:max_listings]:
            listing = await self.scrape_listing(url)
            if listing:
                listings_scraped += 1
                yield listing

                if listings_scraped >= max_listings:
                    break

        logger.info(f"Scraped {listings_scraped} listings from {self.SITE_NAME}/{city}")

    # Helper methods for parsing

    def _extract_price(self, text: str) -> Optional[float]:
        """Extract numeric price from text.

        Args:
            text: Price text (e.g., "2 500 zł/miesiąc")

        Returns:
            Price as float or None
        """
        if not text:
            return None

        # Remove common suffixes and clean text
        text = text.replace("zł", "").replace("PLN", "")
        text = text.replace("/miesiąc", "").replace("/mc", "").replace("/mies", "")
        text = re.sub(r"\s+", "", text)  # Remove all whitespace
        text = text.replace(",", ".")  # Handle decimal comma

        # Extract first number
        match = re.search(r"[\d.]+", text)
        if match:
            try:
                return float(match.group())
            except ValueError:
                return None
        return None

    def _extract_size(self, text: str) -> Optional[float]:
        """Extract size in square meters from text.

        Args:
            text: Size text (e.g., "45 m²")

        Returns:
            Size as float or None
        """
        if not text:
            return None

        text = text.replace("m²", "").replace("m2", "").replace("mkw", "")
        text = re.sub(r"\s+", "", text)
        text = text.replace(",", ".")

        match = re.search(r"[\d.]+", text)
        if match:
            try:
                return float(match.group())
            except ValueError:
                return None
        return None

    def _extract_rooms(self, text: str) -> Optional[int]:
        """Extract number of rooms from text.

        Args:
            text: Rooms text

        Returns:
            Number of rooms or None
        """
        if not text:
            return None

        # Handle "kawalerka" (studio)
        if "kawalerka" in text.lower():
            return 1

        match = re.search(r"(\d+)", text)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                return None
        return None

    def _clean_text(self, text: str) -> str:
        """Clean extracted text.

        Args:
            text: Raw text

        Returns:
            Cleaned text
        """
        if not text:
            return ""

        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _extract_id_from_url(self, url: str) -> str:
        """Extract listing ID from URL.

        Args:
            url: Listing URL

        Returns:
            Extracted ID or hash of URL
        """
        # Try common patterns
        patterns = [
            r"ID([a-zA-Z0-9]+)",
            r"/(\d+)\.html",
            r"-(\d+)$",
            r"/([a-zA-Z0-9-]+)$",
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        # Fallback to URL hash
        import hashlib

        return hashlib.md5(url.encode()).hexdigest()[:12]
