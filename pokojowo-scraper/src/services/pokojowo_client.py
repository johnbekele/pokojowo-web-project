"""Pokojowo API client for authentication and listing management."""

import logging
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional

import httpx

from src.config import settings
from src.models import ProcessedListing

logger = logging.getLogger(__name__)


class PokojowoClientError(Exception):
    """Base exception for Pokojowo client errors."""

    pass


class AuthenticationError(PokojowoClientError):
    """Authentication failed."""

    pass


class PokojowoClient:
    """Client for interacting with Pokojowo FastAPI backend."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.pokojowo_api_url).rstrip("/")
        self.email = email or settings.pokojowo_email
        self.password = password or settings.pokojowo_password

        self._access_token: Optional[str] = None
        self._refresh_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self._user_id: Optional[str] = None

        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            follow_redirects=True,
        )

    async def __aenter__(self):
        await self.authenticate()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()

    @property
    def is_authenticated(self) -> bool:
        """Check if client has valid authentication."""
        if not self._access_token:
            return False
        if self._token_expires_at and datetime.utcnow() >= self._token_expires_at:
            return False
        return True

    async def authenticate(self) -> None:
        """Authenticate with Pokojowo API and get access token."""
        logger.info(f"Authenticating with Pokojowo API as {self.email}")

        try:
            response = await self._client.post(
                f"{self.base_url}/api/auth/login",
                json={"email": self.email, "password": self.password},
            )

            if response.status_code == 401:
                raise AuthenticationError("Invalid email or password")

            response.raise_for_status()
            data = response.json()

            self._access_token = data["access_token"]
            self._refresh_token = data["refresh_token"]
            self._user_id = data["user"]["_id"]

            # Token expires in 24 hours, refresh 1 hour early
            self._token_expires_at = datetime.utcnow() + timedelta(hours=23)

            logger.info(f"Successfully authenticated as user {self._user_id}")

        except httpx.HTTPError as e:
            raise PokojowoClientError(f"Authentication request failed: {e}")

    async def _ensure_authenticated(self) -> None:
        """Ensure we have a valid access token, refreshing if needed."""
        if not self.is_authenticated:
            if self._refresh_token:
                await self._refresh_access_token()
            else:
                await self.authenticate()

    async def _refresh_access_token(self) -> None:
        """Refresh the access token using refresh token."""
        logger.debug("Refreshing access token")

        try:
            response = await self._client.post(
                f"{self.base_url}/api/auth/refresh",
                json={"refresh_token": self._refresh_token},
            )
            response.raise_for_status()
            data = response.json()

            self._access_token = data["access_token"]
            self._token_expires_at = datetime.utcnow() + timedelta(hours=23)

            logger.debug("Access token refreshed successfully")

        except httpx.HTTPError:
            # Refresh failed, try full re-authentication
            logger.warning("Token refresh failed, re-authenticating")
            await self.authenticate()

    def _get_auth_headers(self) -> dict:
        """Get headers with authentication."""
        return {
            "Authorization": f"Bearer {self._access_token}",
        }

    async def test_connection(self) -> dict:
        """Test API connection and authentication."""
        await self._ensure_authenticated()

        response = await self._client.get(
            f"{self.base_url}/api/users/me",
            headers=self._get_auth_headers(),
        )
        response.raise_for_status()
        return response.json()

    async def upload_image(self, image_data: bytes, filename: str) -> str:
        """Upload a single image and return its URL.

        Args:
            image_data: Raw image bytes
            filename: Original filename with extension

        Returns:
            URL of uploaded image
        """
        await self._ensure_authenticated()

        files = {"file": (filename, BytesIO(image_data), "image/jpeg")}

        response = await self._client.post(
            f"{self.base_url}/api/upload/listing",
            headers=self._get_auth_headers(),
            files=files,
        )

        if response.status_code == 403:
            raise PokojowoClientError(
                "User does not have landlord permissions. "
                "Ensure the scraper account has is_landlord=True"
            )

        response.raise_for_status()
        data = response.json()
        return data["url"]

    async def upload_images(self, images: list[tuple[bytes, str]]) -> list[str]:
        """Upload multiple images and return their URLs.

        Args:
            images: List of (image_data, filename) tuples

        Returns:
            List of uploaded image URLs
        """
        await self._ensure_authenticated()

        if not images:
            return []

        # API supports max 10 images per request
        batch_size = 10
        uploaded_urls = []

        for i in range(0, len(images), batch_size):
            batch = images[i : i + batch_size]
            files = [
                ("files", (filename, BytesIO(data), "image/jpeg"))
                for data, filename in batch
            ]

            response = await self._client.post(
                f"{self.base_url}/api/upload/listing/multiple",
                headers=self._get_auth_headers(),
                files=files,
            )

            if response.status_code == 403:
                raise PokojowoClientError(
                    "User does not have landlord permissions"
                )

            response.raise_for_status()
            data = response.json()
            uploaded_urls.extend([f["url"] for f in data["files"]])

        return uploaded_urls

    async def create_listing(self, listing: ProcessedListing) -> str:
        """Create a new listing on Pokojowo.

        Args:
            listing: Processed listing data

        Returns:
            Created listing ID
        """
        await self._ensure_authenticated()

        payload = listing.to_pokojowo_payload()

        response = await self._client.post(
            f"{self.base_url}/api/listings/",
            headers=self._get_auth_headers(),
            json=payload,
        )

        if response.status_code == 403:
            raise PokojowoClientError("User does not have landlord permissions")

        if response.status_code == 422:
            error_detail = response.json()
            raise PokojowoClientError(f"Validation error: {error_detail}")

        response.raise_for_status()
        data = response.json()
        listing_id = data.get("listing_id") or data.get("_id") or data.get("id")

        logger.info(f"Created listing {listing_id} on Pokojowo")
        return listing_id

    async def get_listings(self, limit: int = 100, skip: int = 0) -> list[dict]:
        """Get existing listings for deduplication check."""
        await self._ensure_authenticated()

        response = await self._client.get(
            f"{self.base_url}/api/listings/",
            headers=self._get_auth_headers(),
            params={"limit": limit, "skip": skip},
        )
        response.raise_for_status()
        return response.json()
