"""Raw scraped listing data model."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class ScrapedListing(BaseModel):
    """Raw listing data extracted from source site."""

    # Source identification
    source_site: str = Field(..., description="Source site name (olx, otodom, gumtree)")
    source_url: str = Field(..., description="Original listing URL")
    source_id: str = Field(..., description="Listing ID on source site")
    scraped_at: datetime = Field(default_factory=datetime.utcnow)

    # Basic info
    title: str = Field(..., description="Original listing title")
    description: str = Field(..., description="Original description (typically Polish)")
    price: float = Field(..., description="Monthly rent price in PLN")
    currency: str = Field(default="PLN")

    # Property details
    address: str = Field(..., description="Full address")
    city: str = Field(..., description="City name")
    size: Optional[float] = Field(None, description="Size in square meters")
    rooms: Optional[int] = Field(None, description="Number of rooms")
    floor: Optional[str] = Field(None, description="Floor number")

    # Images
    image_urls: list[str] = Field(default_factory=list, description="List of image URLs")

    # Additional attributes (raw from source)
    attributes: dict = Field(
        default_factory=dict, description="Additional attributes from source"
    )

    # Metadata
    is_promoted: bool = Field(default=False, description="Whether listing is promoted")
    posted_date: Optional[datetime] = Field(None, description="Original posting date")
    seller_type: Optional[str] = Field(None, description="Agency or private seller")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

    def generate_hash(self) -> str:
        """Generate a hash for deduplication based on key fields."""
        import hashlib

        key_parts = [
            self.source_url,
            self.address.lower().strip(),
            str(int(self.price)),
        ]
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]

    @property
    def source_domain(self) -> str:
        """Get the source domain for attribution."""
        from urllib.parse import urlparse

        parsed = urlparse(self.source_url)
        return parsed.netloc
