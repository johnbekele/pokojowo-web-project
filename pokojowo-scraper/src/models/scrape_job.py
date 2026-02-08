"""Scrape job tracking model."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ScrapeJobStatus(str, Enum):
    """Status of a scrape job."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScrapeJobStats(BaseModel):
    """Statistics for a scrape job."""

    total_listings_found: int = 0
    duplicates_skipped: int = 0
    processed_successfully: int = 0
    failed_to_process: int = 0
    images_uploaded: int = 0


class ScrapeJob(BaseModel):
    """Scrape job tracking model."""

    id: Optional[str] = Field(None, alias="_id")
    job_id: str = Field(..., description="Unique job identifier")

    # Job configuration
    site: str = Field(..., description="Target site (olx, otodom, gumtree, all)")
    city: str = Field(..., description="Target city")
    max_listings: int = Field(default=100)
    dry_run: bool = Field(default=False, description="If true, don't publish to Pokojowo")

    # Status tracking
    status: ScrapeJobStatus = Field(default=ScrapeJobStatus.PENDING)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    # Statistics
    stats: ScrapeJobStats = Field(default_factory=ScrapeJobStats)

    # Processed listings (IDs)
    processed_listing_ids: list[str] = Field(default_factory=list)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate job duration in seconds."""
        if not self.started_at:
            return None
        end_time = self.completed_at or datetime.utcnow()
        return (end_time - self.started_at).total_seconds()

    def mark_started(self) -> None:
        """Mark job as started."""
        self.status = ScrapeJobStatus.RUNNING
        self.started_at = datetime.utcnow()

    def mark_completed(self) -> None:
        """Mark job as completed."""
        self.status = ScrapeJobStatus.COMPLETED
        self.completed_at = datetime.utcnow()

    def mark_failed(self, error: str) -> None:
        """Mark job as failed with error message."""
        self.status = ScrapeJobStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error
