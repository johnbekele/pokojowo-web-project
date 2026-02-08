"""Browser tools for the scraper agent."""

import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Default headers for requests
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
}


class BrowserTools:
    """Tools for browser-like HTTP requests."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers=DEFAULT_HEADERS,
                timeout=httpx.Timeout(self.timeout),
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def navigate_to_url(self, url: str) -> dict:
        """Navigate to a URL and return page content.

        This tool fetches a web page and returns its HTML content.
        Use this to load search result pages or listing detail pages.

        Args:
            url: The URL to navigate to

        Returns:
            Dictionary with:
            - success: bool
            - html: Page HTML content (if successful)
            - status_code: HTTP status code
            - error: Error message (if failed)
        """
        try:
            client = await self._get_client()
            response = await client.get(url)

            return {
                "success": response.status_code == 200,
                "html": response.text,
                "status_code": response.status_code,
                "url": str(response.url),  # Final URL after redirects
                "content_length": len(response.text),
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": f"Request timed out after {self.timeout} seconds",
                "status_code": None,
            }
        except httpx.HTTPError as e:
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}",
                "status_code": None,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "status_code": None,
            }

    async def get_page_content(self, url: str) -> dict:
        """Get HTML content from a URL.

        Simplified version of navigate_to_url for quick content fetching.

        Args:
            url: The URL to fetch

        Returns:
            Dictionary with html content or error
        """
        result = await self.navigate_to_url(url)

        if result["success"]:
            return {
                "success": True,
                "html": result["html"],
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
            }

    async def check_captcha(self, html: str) -> dict:
        """Check if page contains CAPTCHA.

        Use this to detect if the site is blocking scraping.

        Args:
            html: Page HTML content

        Returns:
            Dictionary with captcha detection result
        """
        captcha_indicators = [
            "g-recaptcha",
            "captcha",
            "hcaptcha",
            "cf-browser-verification",
            "challenge-running",
            "challenge-form",
        ]

        html_lower = html.lower()
        detected = []

        for indicator in captcha_indicators:
            if indicator in html_lower:
                detected.append(indicator)

        return {
            "has_captcha": len(detected) > 0,
            "detected_types": detected,
        }


# Tool definitions for Claude API
BROWSER_TOOLS = [
    {
        "name": "navigate_to_url",
        "description": """Navigate to a URL and fetch the page HTML content.
Use this tool to:
- Load search result pages from OLX, Otodom, or Gumtree
- Load individual listing detail pages
- Navigate through pagination

The tool handles redirects and returns the final URL along with the content.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The full URL to navigate to (must start with http:// or https://)",
                }
            },
            "required": ["url"],
        },
    },
    {
        "name": "get_page_content",
        "description": "Quickly fetch HTML content from a URL. Use this for simple page loads.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "URL to fetch",
                }
            },
            "required": ["url"],
        },
    },
    {
        "name": "check_captcha",
        "description": """Check if a page contains CAPTCHA protection.
Use this after fetching a page that might be blocking scraping.
If CAPTCHA is detected, you should skip that page or wait before retrying.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "html": {
                    "type": "string",
                    "description": "HTML content to check for CAPTCHA",
                }
            },
            "required": ["html"],
        },
    },
]
