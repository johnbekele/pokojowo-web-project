"""Polite HTTP fetcher: curl_cffi Chrome impersonation, per-domain rate
limiting with jitter, block detection, optional disk cache for fixtures."""

import asyncio
import hashlib
import logging
import random
import time
from pathlib import Path
from urllib.parse import urlparse

from curl_cffi.requests import AsyncSession, RequestsError

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
        self.fetch_attempts = 0
        self.fetch_retries = 0
        self.fetch_successes = 0

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
        for attempt in range(settings.fetch_max_attempts):
            self.fetch_attempts += 1
            await self._respect_rate_limit(urlparse(url).netloc)
            try:
                resp = await self._session.get(url)
            except RequestsError as exc:
                if attempt + 1 >= settings.fetch_max_attempts:
                    raise
                await self._backoff(url, attempt, exc)
                continue

            if resp.status_code == 403:
                raise BlockedError(f"403 for {url}")
            if resp.status_code == 429 or 500 <= resp.status_code <= 599:
                if attempt + 1 >= settings.fetch_max_attempts:
                    resp.raise_for_status()
                await self._backoff(url, attempt, f"HTTP {resp.status_code}")
                continue
            # 404 and other permanent 4xx responses are raised immediately.
            resp.raise_for_status()

            self.pages_fetched += 1
            self.fetch_successes += 1
            text = resp.text
            head = text[:4000]
            if any(marker in head for marker in BLOCK_MARKERS):
                raise BlockedError(f"challenge page at {url}")

            if cache:
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_text(text, encoding="utf-8")
            return text

        raise RuntimeError(f"fetch attempts exhausted for {url}")

    async def _backoff(self, url: str, attempt: int, reason: object) -> None:
        self.fetch_retries += 1
        delay = min(
            settings.fetch_backoff_max,
            settings.fetch_backoff_base * (2**attempt) + random.uniform(0, 0.25),
        )
        logger.warning("transient fetch failure for %s (%s); retrying in %.2fs", url, reason, delay)
        await asyncio.sleep(delay)
