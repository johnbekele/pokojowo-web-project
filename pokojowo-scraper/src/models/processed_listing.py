"""Processed listing ready for Pokojowo API."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RoomType(str, Enum):
    """Room type enum matching Pokojowo API."""

    SINGLE = "Single"
    DOUBLE = "Double"
    SUITE = "Suite"


class BuildingType(str, Enum):
    """Building type enum matching Pokojowo API."""

    APARTMENT = "Apartment"
    LOFT = "Loft"
    BLOCK = "Block"
    DETACHED_HOUSE = "Detached_House"


class RentFor(str, Enum):
    """Rent for enum matching Pokojowo API."""

    WOMEN = "Women"
    MAN = "Man"
    FAMILY = "Family"
    COUPLE = "Couple"
    LOCAL = "Local"
    STUDENT = "Student"
    OPEN_TO_ALL = "Open to All"


class BilingualText(BaseModel):
    """Bilingual text with English and Polish versions."""

    en: str = Field(..., description="English text")
    pl: str = Field(..., description="Polish text")


class ProcessedListing(BaseModel):
    """Processed listing ready for Pokojowo API submission."""

    # Source tracking
    source_url: str = Field(..., description="Original listing URL for attribution")
    source_site: str = Field(..., description="Source site name")
    source_id: str = Field(..., description="Original listing ID")
    dedup_hash: str = Field(..., description="Deduplication hash")

    # Required Pokojowo fields
    address: str = Field(..., description="Full address")
    price: float = Field(..., description="Monthly rent in PLN")
    size: float = Field(..., description="Size in square meters")
    max_tenants: int = Field(default=2, alias="maxTenants")
    images: list[str] = Field(default_factory=list, description="Uploaded image URLs")
    description: BilingualText = Field(..., description="Bilingual description")
    available_from: datetime = Field(alias="availableFrom")
    room_type: RoomType = Field(alias="roomType")
    building_type: BuildingType = Field(alias="buildingType")
    rent_for_only: list[RentFor] = Field(
        default=[RentFor.OPEN_TO_ALL], alias="rentForOnly"
    )
    can_be_contacted: list[str] = Field(
        default=["email"], alias="canBeContacted"
    )
    close_to: Optional[list[str]] = Field(default=None, alias="closeTo")
    ai_help: bool = Field(default=False, alias="AIHelp")

    # Internal tracking
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    pokojowo_listing_id: Optional[str] = Field(
        None, description="Pokojowo listing ID after creation"
    )

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

    def to_pokojowo_payload(self) -> dict:
        """Convert to Pokojowo API payload format."""
        # Format description with source attribution
        description_with_attribution = {
            "en": f"{self.description.en}\n\n---\n*Originally listed on {self.source_site}. "
                  f"[View original listing]({self.source_url})*",
            "pl": f"{self.description.pl}\n\n---\n*Pierwotnie zamieszczone na {self.source_site}. "
                  f"[Zobacz oryginalne ogłoszenie]({self.source_url})*",
        }

        return {
            "address": self.address,
            "price": self.price,
            "size": self.size,
            "maxTenants": self.max_tenants,
            "images": self.images,
            "description": description_with_attribution,
            "availableFrom": self.available_from.isoformat(),
            "roomType": self.room_type.value,
            "buildingType": self.building_type.value,
            "rentForOnly": [r.value for r in self.rent_for_only],
            "canBeContacted": self.can_be_contacted,
            "closeTo": self.close_to,
            "AIHelp": self.ai_help,
        }
