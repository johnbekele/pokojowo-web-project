"""FastAPI Dashboard API for Scraper Management."""

from .app import app
from .routes import jobs, pending_listings, stats, approval

__all__ = ["app"]
