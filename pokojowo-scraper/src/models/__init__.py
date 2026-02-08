"""Data models for the scraper."""

from .scraped_listing import ScrapedListing
from .processed_listing import ProcessedListing, BilingualText
from .scrape_job import ScrapeJob, ScrapeJobStatus

__all__ = [
    "ScrapedListing",
    "ProcessedListing",
    "BilingualText",
    "ScrapeJob",
    "ScrapeJobStatus",
]
