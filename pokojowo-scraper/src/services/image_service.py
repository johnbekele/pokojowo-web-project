"""Image service for downloading and processing listing images."""

import logging
from io import BytesIO
from typing import Optional
from urllib.parse import urlparse
import asyncio

import httpx

logger = logging.getLogger(__name__)

# Maximum image size to download (10MB)
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# Allowed image extensions
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}

# Common user agent for image downloads
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


class ImageService:
    """Service for downloading and processing listing images."""

    def __init__(self, timeout: int = 30, max_concurrent: int = 5):
        self.timeout = timeout
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def download_image(
        self, url: str, client: Optional[httpx.AsyncClient] = None
    ) -> Optional[tuple[bytes, str]]:
        """Download an image from URL.

        Args:
            url: Image URL
            client: Optional HTTP client to reuse

        Returns:
            Tuple of (image_bytes, filename) or None if failed
        """
        async with self._semaphore:
            should_close = False
            if client is None:
                client = httpx.AsyncClient(
                    timeout=httpx.Timeout(self.timeout),
                    follow_redirects=True,
                )
                should_close = True

            try:
                # Parse URL to get filename
                parsed = urlparse(url)
                path_parts = parsed.path.split("/")
                original_filename = path_parts[-1] if path_parts else "image.jpg"

                # Ensure valid extension
                ext = original_filename.split(".")[-1].lower() if "." in original_filename else "jpg"
                if ext not in ALLOWED_EXTENSIONS:
                    ext = "jpg"
                filename = f"scraped_{hash(url) & 0xFFFFFFFF:08x}.{ext}"

                # Download image
                response = await client.get(
                    url,
                    headers={"User-Agent": USER_AGENT},
                )
                response.raise_for_status()

                # Check content type
                content_type = response.headers.get("content-type", "")
                if not content_type.startswith("image/"):
                    logger.warning(f"Non-image content type for {url}: {content_type}")
                    return None

                # Check size
                content = response.content
                if len(content) > MAX_IMAGE_SIZE:
                    logger.warning(f"Image too large ({len(content)} bytes): {url}")
                    return None

                if len(content) < 1000:
                    logger.warning(f"Image too small ({len(content)} bytes): {url}")
                    return None

                logger.debug(f"Downloaded image: {url} ({len(content)} bytes)")
                return (content, filename)

            except httpx.HTTPError as e:
                logger.warning(f"Failed to download image {url}: {e}")
                return None

            finally:
                if should_close:
                    await client.aclose()

    async def download_images(
        self, urls: list[str], max_images: int = 10
    ) -> list[tuple[bytes, str]]:
        """Download multiple images concurrently.

        Args:
            urls: List of image URLs
            max_images: Maximum number of images to download

        Returns:
            List of (image_bytes, filename) tuples for successful downloads
        """
        if not urls:
            return []

        # Limit number of images
        urls_to_download = urls[:max_images]

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            follow_redirects=True,
        ) as client:
            tasks = [self.download_image(url, client) for url in urls_to_download]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out failures and exceptions
        images = []
        for result in results:
            if isinstance(result, tuple) and result is not None:
                images.append(result)
            elif isinstance(result, Exception):
                logger.debug(f"Image download exception: {result}")

        logger.info(f"Downloaded {len(images)}/{len(urls_to_download)} images")
        return images

    def validate_image_url(self, url: str) -> bool:
        """Check if URL appears to be a valid image URL.

        Args:
            url: URL to validate

        Returns:
            True if URL looks like an image
        """
        if not url or not url.startswith(("http://", "https://")):
            return False

        parsed = urlparse(url)
        path_lower = parsed.path.lower()

        # Check extension
        for ext in ALLOWED_EXTENSIONS:
            if path_lower.endswith(f".{ext}"):
                return True

        # Some CDNs don't have extensions, allow them
        image_hosts = ["imgcdn", "images", "img", "photos", "photo", "cdn"]
        for host in image_hosts:
            if host in parsed.netloc.lower():
                return True

        return False
