"""Main scraper agent using Claude for autonomous scraping decisions."""

import asyncio
import json
import logging
from datetime import datetime
from typing import AsyncGenerator, Optional

import anthropic

from src.config import settings
from src.models import ScrapeJob, ScrapeJobStatus
from src.services import PokojowoClient, DeduplicationService, ImageService, TranslationService
from src.scrapers import get_scraper
from .tools.browser_tools import BrowserTools, BROWSER_TOOLS
from .tools.extraction_tools import ExtractionTools, EXTRACTION_TOOLS
from .tools.api_tools import APITools, API_TOOLS

logger = logging.getLogger(__name__)


SCRAPER_SYSTEM_PROMPT = """You are an AI-powered rental listing scraper for Pokojowo, a platform that aggregates Polish rental listings. Your job is to:

1. Navigate to rental listing websites (OLX.pl, Otodom.pl, Gumtree.pl)
2. Extract listing information from search results and detail pages
3. Check for duplicates before processing
4. Translate Polish descriptions to English
5. Classify listings (room type, building type, target tenants)
6. Upload images and publish listings to Pokojowo

## Workflow for each listing:

1. **Check Duplicate**: Always check if a listing URL has been scraped before
2. **Extract Data**: Parse the listing page for title, price, description, images, etc.
3. **Translate**: Convert Polish descriptions to natural English
4. **Classify**: Determine room_type (Single/Double/Suite) and building_type
5. **Process Images**: Download source images and upload to Pokojowo
6. **Publish**: Create the listing on Pokojowo with source attribution

## Important Guidelines:

- Always check for CAPTCHA after fetching pages
- Respect rate limits - don't fetch too quickly
- Skip listings that fail extraction rather than stopping entirely
- Include source_url attribution in all published listings
- Default to reasonable values when information is missing:
  - size: estimate from rooms or default to 40m²
  - room_type: Double if uncertain
  - building_type: Apartment if uncertain
  - rent_for_only: ["Open to All"] if not specified

## Error Handling:

- If CAPTCHA detected: Skip the page and report
- If extraction fails: Log error and continue to next listing
- If image download fails: Publish with available images
- If translation fails: Use original Polish text for both

Be efficient and process listings in batches where possible. Report progress regularly.
"""


class ScraperAgent:
    """Claude-powered agent for autonomous rental listing scraping."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        dry_run: bool = False,
    ):
        self.client = anthropic.Anthropic(api_key=api_key or settings.anthropic_api_key)
        self.model = model or settings.claude_model
        self.dry_run = dry_run

        # Initialize services
        self.pokojowo_client: Optional[PokojowoClient] = None
        self.dedup_service: Optional[DeduplicationService] = None
        self.translation_service: Optional[TranslationService] = None

        # Initialize tools
        self.browser_tools = BrowserTools()
        self.extraction_tools = ExtractionTools()
        self.api_tools: Optional[APITools] = None

        # All tools combined
        self.tools = BROWSER_TOOLS + EXTRACTION_TOOLS + API_TOOLS

    async def initialize(self):
        """Initialize services and connections."""
        logger.info("Initializing scraper agent services...")

        # Initialize Pokojowo client
        self.pokojowo_client = PokojowoClient()
        if not self.dry_run:
            await self.pokojowo_client.authenticate()
            logger.info("Authenticated with Pokojowo API")

        # Initialize deduplication service
        self.dedup_service = DeduplicationService()
        await self.dedup_service.connect()
        logger.info("Connected to deduplication database")

        # Initialize translation service
        self.translation_service = TranslationService()

        # Initialize API tools with services
        self.api_tools = APITools(
            pokojowo_client=self.pokojowo_client,
            dedup_service=self.dedup_service,
            translation_service=self.translation_service,
        )

        logger.info("Scraper agent initialized")

    async def cleanup(self):
        """Cleanup resources."""
        await self.browser_tools.close()
        if self.pokojowo_client:
            await self.pokojowo_client.close()
        if self.dedup_service:
            await self.dedup_service.close()

    async def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        """Execute a tool and return the result as a string."""
        try:
            # Browser tools
            if tool_name == "navigate_to_url":
                result = await self.browser_tools.navigate_to_url(tool_input["url"])
            elif tool_name == "get_page_content":
                result = await self.browser_tools.get_page_content(tool_input["url"])
            elif tool_name == "check_captcha":
                result = await self.browser_tools.check_captcha(tool_input["html"])

            # Extraction tools
            elif tool_name == "extract_listing_data":
                result = await self.extraction_tools.extract_listing_data(
                    tool_input["url"], tool_input["html"], tool_input["site"]
                )
            elif tool_name == "classify_room_type":
                result = await self.extraction_tools.classify_room_type(
                    tool_input.get("rooms"), tool_input.get("size")
                )
            elif tool_name == "classify_building_type":
                result = await self.extraction_tools.classify_building_type(
                    tool_input.get("text", ""), tool_input.get("attributes", {})
                )
            elif tool_name == "determine_rent_for":
                result = await self.extraction_tools.determine_rent_for(
                    tool_input.get("description", "")
                )

            # API tools
            elif tool_name == "check_duplicate":
                result = await self.api_tools.check_duplicate(
                    tool_input["source_url"],
                    tool_input["address"],
                    tool_input["price"],
                )
            elif tool_name == "translate_to_bilingual":
                result = await self.api_tools.translate_to_bilingual(
                    tool_input["polish_text"]
                )
            elif tool_name == "download_upload_images":
                result = await self.api_tools.download_upload_images(
                    tool_input["image_urls"]
                )
            elif tool_name == "publish_listing":
                # Add dry_run flag
                tool_input["dry_run"] = self.dry_run
                result = await self.api_tools.publish_listing(**tool_input)

            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            return json.dumps(result, default=str)

        except Exception as e:
            logger.error(f"Tool execution error ({tool_name}): {e}")
            return json.dumps({"error": str(e)})

    async def run_scrape_job(
        self,
        site: str,
        city: str,
        max_listings: int = 50,
        job: Optional[ScrapeJob] = None,
    ) -> ScrapeJob:
        """Run a scraping job using the Claude agent.

        Args:
            site: Target site (olx, otodom, gumtree)
            city: Target city
            max_listings: Maximum listings to scrape
            job: Optional existing job to update

        Returns:
            Updated ScrapeJob with results
        """
        if job is None:
            job = ScrapeJob(
                job_id=f"{site}-{city}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                site=site,
                city=city,
                max_listings=max_listings,
                dry_run=self.dry_run,
            )

        job.mark_started()
        logger.info(f"Starting scrape job: {job.job_id}")

        try:
            # Use the appropriate scraper to get listing URLs first
            scraper = get_scraper(site)
            listing_urls = []

            # Get listing URLs from search pages
            for page in range(1, 6):  # Max 5 pages
                urls = await scraper.scrape_search_page(city, page)
                if not urls:
                    break
                listing_urls.extend(urls)
                if len(listing_urls) >= max_listings:
                    break

            listing_urls = listing_urls[:max_listings]
            job.stats.total_listings_found = len(listing_urls)
            logger.info(f"Found {len(listing_urls)} listing URLs to process")

            await scraper.close()

            # Process each listing with Claude agent
            for i, url in enumerate(listing_urls):
                logger.info(f"Processing listing {i+1}/{len(listing_urls)}: {url}")

                try:
                    success = await self._process_single_listing(site, url)
                    if success:
                        job.stats.processed_successfully += 1
                        job.processed_listing_ids.append(url)
                    else:
                        job.stats.failed_to_process += 1
                except Exception as e:
                    logger.error(f"Error processing {url}: {e}")
                    job.stats.failed_to_process += 1

            job.mark_completed()
            logger.info(
                f"Job completed: {job.stats.processed_successfully} published, "
                f"{job.stats.failed_to_process} failed"
            )

        except Exception as e:
            logger.error(f"Job failed: {e}")
            job.mark_failed(str(e))

        return job

    async def _process_single_listing(self, site: str, url: str) -> bool:
        """Process a single listing through the agent workflow.

        Returns True if listing was successfully processed and published.
        """
        # Simplified processing without full agentic loop for efficiency
        try:
            # 1. Fetch the listing page
            page_result = await self.browser_tools.navigate_to_url(url)
            if not page_result.get("success"):
                logger.warning(f"Failed to fetch {url}")
                return False

            html = page_result["html"]

            # 2. Check for CAPTCHA
            captcha_check = await self.browser_tools.check_captcha(html)
            if captcha_check.get("has_captcha"):
                logger.warning(f"CAPTCHA detected for {url}")
                return False

            # 3. Extract listing data
            extraction = await self.extraction_tools.extract_listing_data(url, html, site)
            if not extraction.get("success") or not extraction.get("price"):
                logger.warning(f"Extraction failed for {url}")
                return False

            address = extraction.get("address", "Unknown location")
            price = extraction.get("price", 0)

            # 4. Check for duplicates
            dup_check = await self.api_tools.check_duplicate(url, address, price)
            if dup_check.get("is_duplicate"):
                logger.info(f"Duplicate skipped: {url}")
                return False

            # 5. Translate description
            description_pl = extraction.get("description", "")
            translation = await self.api_tools.translate_to_bilingual(description_pl)
            description_en = translation.get("en", description_pl)

            # 6. Classify room and building type
            attrs = extraction.get("attributes", {})
            rooms = self._extract_rooms_from_attrs(attrs)
            size = self._extract_size_from_attrs(attrs) or 40.0

            room_class = await self.extraction_tools.classify_room_type(rooms, size)
            building_class = await self.extraction_tools.classify_building_type(
                f"{extraction.get('title', '')} {description_pl}", attrs
            )
            rent_for = await self.extraction_tools.determine_rent_for(description_pl)

            # 7. Download and upload images
            image_urls = extraction.get("images", [])
            img_result = await self.api_tools.download_upload_images(image_urls)
            uploaded_images = img_result.get("uploaded_urls", [])

            # 8. Publish the listing
            publish_result = await self.api_tools.publish_listing(
                source_url=url,
                source_site=site,
                source_id=self._extract_id(url),
                address=address,
                price=price,
                size=size,
                description_en=description_en,
                description_pl=description_pl,
                image_urls=uploaded_images,
                room_type=room_class["room_type"],
                building_type=building_class["building_type"],
                rent_for_only=rent_for["rent_for_only"],
                dry_run=self.dry_run,
            )

            if publish_result.get("success"):
                logger.info(f"Published: {url} -> {publish_result.get('listing_id')}")
                return True
            else:
                logger.warning(f"Publish failed for {url}: {publish_result.get('error')}")
                return False

        except Exception as e:
            logger.error(f"Processing error for {url}: {e}")
            return False

    def _extract_rooms_from_attrs(self, attrs: dict) -> Optional[int]:
        """Extract room count from attributes."""
        for key in ["rooms", "liczba pokoi", "rooms_num"]:
            if key in attrs:
                try:
                    return int(attrs[key].split()[0])
                except (ValueError, AttributeError, IndexError):
                    pass
        return None

    def _extract_size_from_attrs(self, attrs: dict) -> Optional[float]:
        """Extract size from attributes."""
        for key in ["size", "powierzchnia", "area", "m"]:
            if key in attrs:
                try:
                    val = str(attrs[key]).replace("m²", "").replace(",", ".").strip()
                    return float(val.split()[0])
                except (ValueError, AttributeError, IndexError):
                    pass
        return None

    def _extract_id(self, url: str) -> str:
        """Extract listing ID from URL."""
        import hashlib
        import re

        # Try common patterns
        patterns = [r"ID([a-zA-Z0-9]+)", r"/(\d+)\.html", r"-(\d+)$"]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        return hashlib.md5(url.encode()).hexdigest()[:12]
