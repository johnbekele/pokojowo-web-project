"""API tools for interacting with Pokojowo and external services."""

import logging
from typing import Optional

from src.services import PokojowoClient, DeduplicationService, ImageService, TranslationService
from src.models import ScrapedListing, ProcessedListing, BilingualText
from src.models.processed_listing import RoomType, BuildingType, RentFor

logger = logging.getLogger(__name__)


class APITools:
    """Tools for API interactions and data publishing."""

    def __init__(
        self,
        pokojowo_client: Optional[PokojowoClient] = None,
        dedup_service: Optional[DeduplicationService] = None,
        image_service: Optional[ImageService] = None,
        translation_service: Optional[TranslationService] = None,
    ):
        self.pokojowo_client = pokojowo_client
        self.dedup_service = dedup_service
        self.image_service = image_service or ImageService()
        self.translation_service = translation_service

    async def check_duplicate(self, source_url: str, address: str, price: float) -> dict:
        """Check if a listing has already been scraped.

        Use this before processing a listing to avoid duplicates.

        Args:
            source_url: The original listing URL
            address: Listing address
            price: Listing price

        Returns:
            Dictionary with is_duplicate boolean and existing_id if duplicate
        """
        if not self.dedup_service:
            return {"is_duplicate": False, "error": "Deduplication service not initialized"}

        try:
            # Create a minimal ScrapedListing for hash generation
            listing = ScrapedListing(
                source_site="check",
                source_url=source_url,
                source_id="check",
                title="check",
                description="check",
                price=price,
                address=address,
                city="check",
            )

            is_dup = await self.dedup_service.is_duplicate(listing)

            return {
                "is_duplicate": is_dup,
                "dedup_hash": listing.generate_hash(),
            }

        except Exception as e:
            logger.error(f"Deduplication check error: {e}")
            return {"is_duplicate": False, "error": str(e)}

    async def translate_to_bilingual(self, polish_text: str) -> dict:
        """Translate Polish description to English and return bilingual format.

        Translates the Polish listing description to natural English while
        preserving the original Polish text.

        Args:
            polish_text: Original Polish description

        Returns:
            Dictionary with en and pl text
        """
        if not self.translation_service:
            return {
                "success": False,
                "error": "Translation service not initialized",
            }

        try:
            bilingual = await self.translation_service.create_bilingual_description(polish_text)

            return {
                "success": True,
                "en": bilingual.en,
                "pl": bilingual.pl,
            }

        except Exception as e:
            logger.error(f"Translation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "pl": polish_text,
                "en": polish_text,  # Fallback to original
            }

    async def download_upload_images(self, image_urls: list[str]) -> dict:
        """Download images from source and upload to Pokojowo.

        Downloads images from the source listing URLs and uploads them
        to the Pokojowo server.

        Args:
            image_urls: List of source image URLs

        Returns:
            Dictionary with uploaded image URLs
        """
        if not image_urls:
            return {"success": True, "uploaded_urls": [], "count": 0}

        if not self.pokojowo_client:
            return {"success": False, "error": "Pokojowo client not initialized"}

        try:
            # Download images
            downloaded = await self.image_service.download_images(image_urls, max_images=10)

            if not downloaded:
                return {
                    "success": False,
                    "error": "No images could be downloaded",
                    "uploaded_urls": [],
                }

            # Upload to Pokojowo
            uploaded_urls = await self.pokojowo_client.upload_images(downloaded)

            return {
                "success": True,
                "uploaded_urls": uploaded_urls,
                "count": len(uploaded_urls),
                "downloaded_count": len(downloaded),
            }

        except Exception as e:
            logger.error(f"Image download/upload error: {e}")
            return {
                "success": False,
                "error": str(e),
                "uploaded_urls": [],
            }

    async def publish_listing(
        self,
        source_url: str,
        source_site: str,
        source_id: str,
        address: str,
        price: float,
        size: float,
        description_en: str,
        description_pl: str,
        image_urls: list[str],
        room_type: str,
        building_type: str,
        rent_for_only: list[str],
        available_from: Optional[str] = None,
        max_tenants: int = 2,
        dry_run: bool = False,
    ) -> dict:
        """Publish a processed listing to Pokojowo.

        Creates a new listing on the Pokojowo platform with all required fields.

        Args:
            source_url: Original listing URL (for attribution)
            source_site: Source site name
            source_id: Original listing ID
            address: Full address
            price: Monthly rent in PLN
            size: Size in square meters
            description_en: English description
            description_pl: Polish description
            image_urls: List of uploaded image URLs
            room_type: Single, Double, or Suite
            building_type: Apartment, Loft, Block, or Detached_House
            rent_for_only: List of target tenant types
            available_from: Available date (ISO format)
            max_tenants: Maximum number of tenants
            dry_run: If True, don't actually publish

        Returns:
            Dictionary with listing_id if successful
        """
        if dry_run:
            logger.info(f"[DRY RUN] Would publish listing: {address} for {price} PLN")
            return {
                "success": True,
                "dry_run": True,
                "listing_id": "dry-run-id",
                "message": "Listing validated but not published (dry run)",
            }

        if not self.pokojowo_client:
            return {"success": False, "error": "Pokojowo client not initialized"}

        try:
            from datetime import datetime

            # Parse available_from or default to now
            if available_from:
                try:
                    avail_date = datetime.fromisoformat(available_from.replace("Z", "+00:00"))
                except ValueError:
                    avail_date = datetime.utcnow()
            else:
                avail_date = datetime.utcnow()

            # Create ProcessedListing
            listing = ProcessedListing(
                source_url=source_url,
                source_site=source_site,
                source_id=source_id,
                dedup_hash=f"{hash(source_url) & 0xFFFFFFFF:08x}",
                address=address,
                price=price,
                size=size,
                maxTenants=max_tenants,
                images=image_urls,
                description=BilingualText(en=description_en, pl=description_pl),
                availableFrom=avail_date,
                roomType=RoomType(room_type),
                buildingType=BuildingType(building_type),
                rentForOnly=[RentFor(r) for r in rent_for_only],
                canBeContacted=["email"],
            )

            # Publish to Pokojowo
            listing_id = await self.pokojowo_client.create_listing(listing)

            # Mark as scraped in deduplication DB
            if self.dedup_service:
                scraped = ScrapedListing(
                    source_site=source_site,
                    source_url=source_url,
                    source_id=source_id,
                    title=f"Published: {address}",
                    description=description_pl,
                    price=price,
                    address=address,
                    city=address.split(",")[0] if "," in address else address,
                )
                await self.dedup_service.mark_scraped(scraped, listing_id)

            return {
                "success": True,
                "listing_id": listing_id,
                "message": f"Listing published successfully",
            }

        except Exception as e:
            logger.error(f"Publish error: {e}")
            return {
                "success": False,
                "error": str(e),
            }


# Tool definitions for Claude API
API_TOOLS = [
    {
        "name": "check_duplicate",
        "description": """Check if a listing has already been scraped.
Use this BEFORE processing each listing to avoid duplicates.
Pass the source URL, address, and price to generate a dedup hash.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_url": {"type": "string", "description": "Original listing URL"},
                "address": {"type": "string", "description": "Listing address"},
                "price": {"type": "number", "description": "Listing price in PLN"},
            },
            "required": ["source_url", "address", "price"],
        },
    },
    {
        "name": "translate_to_bilingual",
        "description": """Translate Polish listing description to English.
Returns both English and Polish versions for bilingual listings.
The translation preserves real estate terminology and the original tone.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "polish_text": {"type": "string", "description": "Polish description to translate"},
            },
            "required": ["polish_text"],
        },
    },
    {
        "name": "download_upload_images",
        "description": """Download images from source URLs and upload to Pokojowo.
Pass the original image URLs from the listing.
Returns the new Pokojowo image URLs to use in the listing.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "image_urls": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of source image URLs",
                },
            },
            "required": ["image_urls"],
        },
    },
    {
        "name": "publish_listing",
        "description": """Publish a processed listing to Pokojowo.
Use this after extracting data, translating, classifying, and uploading images.
All required fields must be provided.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_url": {"type": "string", "description": "Original listing URL"},
                "source_site": {"type": "string", "description": "olx, otodom, or gumtree"},
                "source_id": {"type": "string", "description": "Original listing ID"},
                "address": {"type": "string", "description": "Full address"},
                "price": {"type": "number", "description": "Monthly rent in PLN"},
                "size": {"type": "number", "description": "Size in square meters"},
                "description_en": {"type": "string", "description": "English description"},
                "description_pl": {"type": "string", "description": "Polish description"},
                "image_urls": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Uploaded Pokojowo image URLs",
                },
                "room_type": {
                    "type": "string",
                    "enum": ["Single", "Double", "Suite"],
                    "description": "Room type classification",
                },
                "building_type": {
                    "type": "string",
                    "enum": ["Apartment", "Loft", "Block", "Detached_House"],
                    "description": "Building type classification",
                },
                "rent_for_only": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Target tenant types",
                },
                "available_from": {"type": "string", "description": "ISO date (optional)"},
                "max_tenants": {"type": "integer", "description": "Max tenants (default 2)"},
                "dry_run": {"type": "boolean", "description": "If true, validate but don't publish"},
            },
            "required": [
                "source_url",
                "source_site",
                "source_id",
                "address",
                "price",
                "size",
                "description_en",
                "description_pl",
                "image_urls",
                "room_type",
                "building_type",
                "rent_for_only",
            ],
        },
    },
]
