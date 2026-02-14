"""AI-powered autonomous scraper using Claude to extract and validate listings."""

import asyncio
import hashlib
import logging
import re
import json
from datetime import datetime
from typing import Optional, Dict, List
from bs4 import BeautifulSoup
import httpx

from src.config.settings import settings

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = settings.anthropic_api_key
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
}


async def ai_extract_listing(
    client: httpx.AsyncClient,
    html: str,
    url: str,
    site: str,
    log_callback=None
) -> Optional[dict]:
    """
    Use Claude AI to autonomously extract listing data from HTML.
    Returns None if listing doesn't meet quality standards.
    """
    if not ANTHROPIC_API_KEY:
        if log_callback:
            log_callback("error", "No Anthropic API key configured")
        return None

    # Truncate HTML to fit context (keep important parts)
    soup = BeautifulSoup(html, "lxml")

    # Remove scripts, styles, nav, footer to reduce noise
    for tag in soup.select("script, style, nav, footer, header, iframe, noscript"):
        tag.decompose()

    # Get main content
    main_content = soup.select_one("main, article, [role='main'], .ad-page, .offer-content")
    if main_content:
        clean_html = str(main_content)[:15000]
    else:
        clean_html = str(soup.body)[:15000] if soup.body else str(soup)[:15000]

    # Also extract JSON-LD and __NEXT_DATA__ if available
    json_data = ""

    # JSON-LD
    for script in soup.select('script[type="application/ld+json"]'):
        if script.string:
            json_data += f"\n\nJSON-LD Schema:\n{script.string[:2000]}"

    # __NEXT_DATA__ for Otodom
    next_data = soup.select_one("script#__NEXT_DATA__")
    if next_data and next_data.string:
        try:
            data = json.loads(next_data.string)
            ad = data.get("props", {}).get("pageProps", {}).get("ad", {})
            if ad:
                json_data += f"\n\nOtodom Ad Data:\n{json.dumps(ad, indent=2)[:5000]}"
        except:
            pass

    prompt = f"""You are an autonomous data extraction agent. Extract rental listing data from this Polish real estate page.

SOURCE: {site.upper()} - {url}

HTML CONTENT:
{clean_html}
{json_data}

EXTRACTION REQUIREMENTS:
1. Extract ALL available information - be thorough
2. For images: Find ALL image URLs (not thumbnails, not logos). Look for:
   - img tags with src containing "img", "photo", "image", "apollo", "otodom"
   - data-src attributes
   - Background images in style attributes
   - Image arrays in JSON data
3. For description: Get the FULL description text, not just title
4. For phone: Look for Polish phone patterns (9 digits, +48, tel:, telefon:)
5. For address: Get full location with street, district, city
6. For price: Extract monthly rent in PLN (not deposit, not admin fees)

QUALITY THRESHOLDS - Return null if:
- No images found (at least 1 required)
- No price found
- Description is less than 50 characters
- Looks like an ad/spam, not a real listing

RESPOND WITH ONLY VALID JSON:
{{
  "valid": true/false,
  "rejection_reason": "reason if invalid, null otherwise",
  "data": {{
    "title": "Listing title",
    "description": {{
      "pl": "Full Polish description (minimum 50 chars)",
      "en": "English translation of description"
    }},
    "price": 2500.00,
    "address": "Full address with street, district, city",
    "size": 45.5,
    "rooms": 2,
    "phone": "+48 XXX XXX XXX or null",
    "images": ["url1", "url2", ...],
    "building_type": "Apartment|Loft|Block|Detached_House",
    "room_type": "Single|Double|Suite",
    "max_tenants": 2,
    "close_to": ["Metro", "University", "Park", ...],
    "available_from": "2024-03-01 or null"
  }}
}}

Be thorough - extract EVERYTHING available. Quality over speed."""

    try:
        if log_callback:
            log_callback("debug", f"AI analyzing {url[:50]}...")

        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 4000,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=90.0
        )
        response.raise_for_status()
        result = response.json()

        content = result.get("content", [])
        if not content:
            return None

        text = content[0].get("text", "")

        # Clean up response
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text)

        extracted = json.loads(text)

        if not extracted.get("valid", False):
            reason = extracted.get("rejection_reason", "Unknown")
            if log_callback:
                log_callback("warning", f"AI rejected listing: {reason}")
            return None

        data = extracted.get("data", {})

        # Validate minimum requirements
        if not data.get("images"):
            if log_callback:
                log_callback("warning", "AI found no images - skipping")
            return None

        if not data.get("price") or data["price"] < 100:
            if log_callback:
                log_callback("warning", "AI found no valid price - skipping")
            return None

        desc = data.get("description", {})
        if isinstance(desc, str):
            desc = {"pl": desc, "en": ""}
        if len(desc.get("pl", "")) < 30:
            if log_callback:
                log_callback("warning", "AI found description too short - skipping")
            return None

        # Build final listing
        listing = {
            "source_url": url,
            "source_site": site,
            "source_id": hashlib.md5(url.encode()).hexdigest()[:12],
            "title": data.get("title", ""),
            "description": desc,
            "price": float(data["price"]),
            "address": data.get("address", ""),
            "size": float(data.get("size", 40)),
            "rooms": data.get("rooms"),
            "phone": data.get("phone"),
            "images": data.get("images", [])[:15],
            "building_type": data.get("building_type", "Apartment"),
            "room_type": data.get("room_type", "Single"),
            "max_tenants": data.get("max_tenants", 2),
            "close_to": data.get("close_to", [])[:15],
            "available_from": data.get("available_from"),
            "ai_extracted": True,
            "scraped_at": datetime.utcnow(),
        }

        # Validate enums
        if listing["building_type"] not in ["Apartment", "Loft", "Block", "Detached_House"]:
            listing["building_type"] = "Apartment"
        if listing["room_type"] not in ["Single", "Double", "Suite"]:
            listing["room_type"] = "Single"

        if log_callback:
            log_callback("info", f"AI extracted: {len(listing['images'])} images, {len(desc.get('en', ''))} char EN desc, phone: {'yes' if listing['phone'] else 'no'}")

        return listing

    except json.JSONDecodeError as e:
        if log_callback:
            log_callback("error", f"AI response parse error: {str(e)[:50]}")
        return None
    except httpx.HTTPStatusError as e:
        if log_callback:
            log_callback("error", f"AI API error: {e.response.status_code}")
        return None
    except Exception as e:
        if log_callback:
            log_callback("error", f"AI extraction error: {str(e)[:50]}")
        return None


async def ai_scrape_search_page(
    client: httpx.AsyncClient,
    html: str,
    site: str,
    city: str,
    log_callback=None
) -> List[str]:
    """
    Use Claude AI to extract listing URLs from a search results page.
    """
    if not ANTHROPIC_API_KEY:
        return []

    # Clean HTML
    soup = BeautifulSoup(html, "lxml")
    for tag in soup.select("script, style, nav, footer"):
        tag.decompose()

    clean_html = str(soup)[:20000]

    prompt = f"""Extract all rental listing URLs from this {site.upper()} search results page.

HTML:
{clean_html}

TASK:
Find all URLs that link to individual rental listings (apartments for rent).
- For OLX: URLs containing "/d/oferta/" or "/ogloszenie/"
- For Otodom: URLs containing "/oferta/"

Ignore:
- Pagination links
- Category/filter links
- External links
- Duplicate URLs

RESPOND WITH ONLY A JSON ARRAY OF URLS:
["https://...", "https://...", ...]

Return empty array [] if no valid listing URLs found."""

    try:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 4000,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()

        content = result.get("content", [])
        if not content:
            return []

        text = content[0].get("text", "").strip()
        if text.startswith("```"):
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text)

        urls = json.loads(text)

        # Validate and clean URLs
        valid_urls = []
        for url in urls:
            if isinstance(url, str) and url.startswith("http"):
                # Ensure full URL
                if not url.startswith("http"):
                    if site == "olx":
                        url = f"https://www.olx.pl{url}"
                    elif site == "otodom":
                        url = f"https://www.otodom.pl{url}"
                valid_urls.append(url)

        if log_callback:
            log_callback("info", f"AI found {len(valid_urls)} listing URLs")

        return valid_urls

    except Exception as e:
        if log_callback:
            log_callback("error", f"AI URL extraction error: {str(e)[:50]}")
        return []


def generate_dedup_hash(url: str, address: str, price: float) -> str:
    """Generate deduplication hash."""
    content = f"{url}|{address}|{price}"
    return hashlib.md5(content.encode()).hexdigest()
