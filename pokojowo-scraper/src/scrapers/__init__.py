"""Site-specific scrapers."""

from .base_scraper import BaseScraper
from .olx_scraper import OLXScraper
from .otodom_scraper import OtodomScraper
from .gumtree_scraper import GumtreeScraper

__all__ = [
    "BaseScraper",
    "OLXScraper",
    "OtodomScraper",
    "GumtreeScraper",
]


def get_scraper(site: str) -> BaseScraper:
    """Get scraper instance by site name.

    Args:
        site: Site name (olx, otodom, gumtree)

    Returns:
        Scraper instance

    Raises:
        ValueError: If site is not supported
    """
    scrapers = {
        "olx": OLXScraper,
        "otodom": OtodomScraper,
        "gumtree": GumtreeScraper,
    }

    if site not in scrapers:
        raise ValueError(f"Unsupported site: {site}. Choose from: {list(scrapers.keys())}")

    return scrapers[site]()
