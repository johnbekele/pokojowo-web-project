"""Polite HTTP fetcher: curl_cffi Chrome impersonation, per-domain rate
limiting with jitter, block detection, optional disk cache for fixtures."""

import asyncio
import hashlib
import logging
import random
import time
from pathlib import Path
from urllib.parse import urlparse

from curl_cffi.requests import AsyncSession

from pokojowo_scraper.config import settings

logger = logging.getLogger(__name__)

BLOCK_MARKERS = (
    "g-recaptcha",
    "data-sitekey",
    "cf-challenge",
    "Access Denied",
    "Attention Required",
)


class BlockedError(Exception):
    """The site returned a challenge/403 — back off, don't retry this run."""


class Fetcher:
    def __init__(self, cache_dir: Path | None = None):
        self._session: AsyncSession | None = None
        self._last_request: dict[str, float] = {}  # domain -> monotonic ts
        self._locks: dict[str, asyncio.Lock] = {}
        self.cache_dir = cache_dir if cache_dir is not None else settings.html_cache_dir
        self.pages_fetched = 0

    async def __aenter__(self) -> "Fetcher":
        self._session = AsyncSession(
            impersonate="chrome",
            timeout=45,
            headers={"Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.6"},
        )
        return self

    async def __aexit__(self, *exc) -> None:
        if self._session:
            await self._session.close()

    def _cache_path(self, url: str) -> Path | None:
        if not self.cache_dir:
            return None
        h = hashlib.sha256(url.encode()).hexdigest()[:24]
        return Path(self.cache_dir) / f"{h}.html"

    async def _respect_rate_limit(self, domain: str) -> None:
        lock = self._locks.setdefault(domain, asyncio.Lock())
        async with lock:
            delay = random.uniform(settings.req_delay_min, settings.req_delay_max)
            elapsed = time.monotonic() - self._last_request.get(domain, 0.0)
            if elapsed < delay:
                await asyncio.sleep(delay - elapsed)
            self._last_request[domain] = time.monotonic()

    async def get(self, url: str) -> str:
        """Fetch a page, honoring cache and politeness. Raises BlockedError
        on challenge pages so callers can abort the site for this run."""
        cache = self._cache_path(url)
        if cache and cache.exists():
            return cache.read_text(encoding="utf-8")

        assert self._session, "use `async with Fetcher()`"
        await self._respect_rate_limit(urlparse(url).netloc)

        resp = await self._session.get(url)
        self.pages_fetched += 1

        if resp.status_code in (403, 429):
            raise BlockedError(f"{resp.status_code} for {url}")
        resp.raise_for_status()

        text = resp.text
        head = text[:4000]
        if any(marker in head for marker in BLOCK_MARKERS):
            raise BlockedError(f"challenge page at {url}")

        if cache:
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(text, encoding="utf-8")
        return text
