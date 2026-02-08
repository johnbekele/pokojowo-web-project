"""Repository for managing scrape jobs in MongoDB."""

import logging
from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from src.config import settings
from src.models import ScrapeJob, ScrapeJobStatus

logger = logging.getLogger(__name__)


class JobRepository:
    """Repository for scrape job persistence."""

    COLLECTION_NAME = "scrape_jobs"

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

            # Ensure indexes
            collection = self._db[self.COLLECTION_NAME]
            await collection.create_index("job_id", unique=True)
            await collection.create_index("status")
            await collection.create_index("started_at")

            logger.info(f"Connected to jobs database: {self.database_name}")

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

    async def save(self, job: ScrapeJob) -> str:
        """Save or update a scrape job.

        Args:
            job: Job to save

        Returns:
            Job ID
        """
        if self._db is None:
            await self.connect()

        doc = job.model_dump(by_alias=True, exclude={"id"})

        await self._db[self.COLLECTION_NAME].update_one(
            {"job_id": job.job_id},
            {"$set": doc},
            upsert=True,
        )

        return job.job_id

    async def get(self, job_id: str) -> Optional[ScrapeJob]:
        """Get a job by ID.

        Args:
            job_id: Job identifier

        Returns:
            ScrapeJob or None
        """
        if self._db is None:
            await self.connect()

        doc = await self._db[self.COLLECTION_NAME].find_one({"job_id": job_id})

        if doc:
            return ScrapeJob(**doc)
        return None

    async def get_recent(
        self,
        limit: int = 10,
        status: Optional[ScrapeJobStatus] = None,
    ) -> list[ScrapeJob]:
        """Get recent jobs.

        Args:
            limit: Maximum jobs to return
            status: Optional status filter

        Returns:
            List of jobs
        """
        if self._db is None:
            await self.connect()

        query = {}
        if status:
            query["status"] = status.value

        cursor = (
            self._db[self.COLLECTION_NAME]
            .find(query)
            .sort("started_at", -1)
            .limit(limit)
        )

        jobs = []
        async for doc in cursor:
            jobs.append(ScrapeJob(**doc))

        return jobs

    async def get_running(self) -> list[ScrapeJob]:
        """Get currently running jobs."""
        return await self.get_recent(limit=100, status=ScrapeJobStatus.RUNNING)

    async def update_status(
        self,
        job_id: str,
        status: ScrapeJobStatus,
        error: Optional[str] = None,
    ) -> None:
        """Update job status.

        Args:
            job_id: Job identifier
            status: New status
            error: Optional error message
        """
        if self._db is None:
            await self.connect()

        update = {
            "status": status.value,
            "completed_at": datetime.utcnow() if status in [
                ScrapeJobStatus.COMPLETED,
                ScrapeJobStatus.FAILED,
            ] else None,
        }

        if error:
            update["error_message"] = error

        await self._db[self.COLLECTION_NAME].update_one(
            {"job_id": job_id},
            {"$set": update},
        )

    async def get_stats(self) -> dict:
        """Get aggregate statistics across all jobs.

        Returns:
            Dictionary with statistics
        """
        if self._db is None:
            await self.connect()

        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_jobs": {"$sum": 1},
                    "total_listings_found": {"$sum": "$stats.total_listings_found"},
                    "total_processed": {"$sum": "$stats.processed_successfully"},
                    "total_failed": {"$sum": "$stats.failed_to_process"},
                    "total_duplicates": {"$sum": "$stats.duplicates_skipped"},
                }
            }
        ]

        result = await self._db[self.COLLECTION_NAME].aggregate(pipeline).to_list(1)

        if result:
            return result[0]
        return {
            "total_jobs": 0,
            "total_listings_found": 0,
            "total_processed": 0,
            "total_failed": 0,
            "total_duplicates": 0,
        }
