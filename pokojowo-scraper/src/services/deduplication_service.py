"""Deduplication service for preventing duplicate listings."""

import logging
from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from src.config import settings
from src.models import ScrapedListing

logger = logging.getLogger(__name__)


class DeduplicationService:
    """Service for tracking and preventing duplicate listings."""

    COLLECTION_NAME = "scraped_listings"

    def __init__(
        self,
        mongodb_url: Optional[str] = None,
        database_name: Optional[str] = None,
    ):
        self.mongodb_url = mongodb_url or settings.scraper_mongodb_url
        self.database_name = database_name or settings.scraper_database_name
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None

    async def connect(self) -> None:
        """Connect to MongoDB."""
        if self._client is None:
            self._client = AsyncIOMotorClient(self.mongodb_url)
            self._db = self._client[self.database_name]

            # Ensure indexes exist
            collection = self._db[self.COLLECTION_NAME]
            await collection.create_index("dedup_hash", unique=True)
            await collection.create_index("source_url")
            await collection.create_index("source_site")
            await collection.create_index("scraped_at")

            logger.info(f"Connected to MongoDB: {self.database_name}")

    async def close(self) -> None:
        """Close MongoDB connection."""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def is_duplicate(self, listing: ScrapedListing) -> bool:
        """Check if a listing has already been scraped.

        Args:
            listing: Scraped listing to check

        Returns:
            True if listing is a duplicate
        """
        if self._db is None:
            await self.connect()

        dedup_hash = listing.generate_hash()

        existing = await self._db[self.COLLECTION_NAME].find_one(
            {"dedup_hash": dedup_hash}
        )

        if existing:
            logger.debug(f"Duplicate found: {listing.source_url} (hash: {dedup_hash})")
            return True

        return False

    async def is_url_scraped(self, source_url: str) -> bool:
        """Check if a specific URL has been scraped.

        Args:
            source_url: URL to check

        Returns:
            True if URL was already scraped
        """
        if self._db is None:
            await self.connect()

        existing = await self._db[self.COLLECTION_NAME].find_one(
            {"source_url": source_url}
        )

        return existing is not None

    async def mark_scraped(
        self,
        listing: ScrapedListing,
        pokojowo_listing_id: Optional[str] = None,
    ) -> str:
        """Mark a listing as scraped.

        Args:
            listing: Scraped listing to track
            pokojowo_listing_id: Optional Pokojowo listing ID if published

        Returns:
            Deduplication hash
        """
        if self._db is None:
            await self.connect()

        dedup_hash = listing.generate_hash()

        document = {
            "dedup_hash": dedup_hash,
            "source_url": listing.source_url,
            "source_site": listing.source_site,
            "source_id": listing.source_id,
            "address": listing.address,
            "price": listing.price,
            "scraped_at": listing.scraped_at,
            "pokojowo_listing_id": pokojowo_listing_id,
        }

        await self._db[self.COLLECTION_NAME].update_one(
            {"dedup_hash": dedup_hash},
            {"$set": document},
            upsert=True,
        )

        logger.debug(f"Marked as scraped: {listing.source_url} -> {dedup_hash}")
        return dedup_hash

    async def get_scraped_count(self, site: Optional[str] = None) -> int:
        """Get count of scraped listings.

        Args:
            site: Optional site filter

        Returns:
            Number of scraped listings
        """
        if self._db is None:
            await self.connect()

        query = {}
        if site:
            query["source_site"] = site

        return await self._db[self.COLLECTION_NAME].count_documents(query)

    async def get_recent_scraped(
        self, site: Optional[str] = None, limit: int = 100
    ) -> list[dict]:
        """Get recently scraped listings.

        Args:
            site: Optional site filter
            limit: Maximum number to return

        Returns:
            List of scraped listing records
        """
        if self._db is None:
            await self.connect()

        query = {}
        if site:
            query["source_site"] = site

        cursor = (
            self._db[self.COLLECTION_NAME]
            .find(query)
            .sort("scraped_at", -1)
            .limit(limit)
        )

        return await cursor.to_list(length=limit)

    async def clear_old_records(self, days: int = 90) -> int:
        """Remove records older than specified days.

        Args:
            days: Age threshold in days

        Returns:
            Number of deleted records
        """
        if self._db is None:
            await self.connect()

        cutoff = datetime.utcnow() - timedelta(days=days)

        result = await self._db[self.COLLECTION_NAME].delete_many(
            {"scraped_at": {"$lt": cutoff}}
        )

        logger.info(f"Cleared {result.deleted_count} old records (older than {days} days)")
        return result.deleted_count


from datetime import timedelta
