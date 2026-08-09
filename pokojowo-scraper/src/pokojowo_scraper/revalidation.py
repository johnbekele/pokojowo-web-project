"""Source revalidation for already-published scraped listings.

Revalidation deliberately distinguishes a source that is gone from one that
could not be checked (for example, a challenge page or a transient outage).
Only an explicit 404/410 or a clear delisted marker counts as unavailable.
"""

from dataclasses import dataclass

from bs4 import BeautifulSoup
from curl_cffi.requests import RequestsError

from pokojowo_scraper.fetch.client import BlockedError, Fetcher, NotFoundError

DELISTED_MARKERS = (
    "ogłoszenie zostało usunięte",
    "ogłoszenie wygasło",
    "oferta została zakończona",
    "oferta jest już nieaktualna",
    "listing has been removed",
    "listing has expired",
    "offer is no longer available",
    "this offer is no longer available",
)


@dataclass(frozen=True)
class SourceCheck:
    available: bool | None
    reason: str


def has_delisted_marker(html: str) -> bool:
    """Return true when visible source text clearly says the offer is gone."""
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True).casefold()
    return any(marker in text for marker in DELISTED_MARKERS)


async def check_source(fetcher: Fetcher, source_url: str) -> SourceCheck:
    """Check one URL without turning access failures into false delistings."""
    try:
        html = await fetcher.get(source_url)
    except NotFoundError as exc:
        return SourceCheck(False, f"http_{exc.status_code}")
    except BlockedError:
        return SourceCheck(None, "blocked_or_robots")
    except RequestsError:
        return SourceCheck(None, "transient_fetch_error")
    except Exception:  # noqa: BLE001 - revalidation must fail safe
        return SourceCheck(None, "unexpected_fetch_error")

    if has_delisted_marker(html):
        return SourceCheck(False, "delisted_marker")
    return SourceCheck(True, "ok")
