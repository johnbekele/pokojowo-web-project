"""
SavedSearch model for persisting a user's listing-search filters.

Matching/notification fan-out is handled in a later issue — this model only
stores the filter payload plus notify preferences. Filter fields are all
Optional/defaulted so incomplete searches (e.g. just a city) round-trip fine.
"""

from beanie import Document, Indexed
from pydantic import Field
from typing import List, Optional
from datetime import datetime


class SavedSearch(Document):
    """A saved listing-search filter belonging to a single user."""
    user_id: Indexed(str) = Field(..., alias="userId")
    name: str = Field(..., alias="name")

    # Filter payload — mirrors the /discover query params. All Optional/defaulted.
    search: Optional[str] = Field(None, alias="search")
    city: Optional[str] = Field(None, alias="city")
    districts: List[str] = Field(default_factory=list, alias="districts")
    min_price: Optional[float] = Field(None, alias="minPrice")
    max_price: Optional[float] = Field(None, alias="maxPrice")
    min_size: Optional[float] = Field(None, alias="minSize")
    max_size: Optional[float] = Field(None, alias="maxSize")
    room_types: List[str] = Field(default_factory=list, alias="roomTypes")
    building_types: List[str] = Field(default_factory=list, alias="buildingTypes")
    rent_for: List[str] = Field(default_factory=list, alias="rentFor")
    max_tenants: Optional[int] = Field(None, alias="maxTenants")
    offered_by: Optional[str] = Field(None, alias="offeredBy")

    notify_enabled: bool = Field(True, alias="notifyEnabled")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    last_notified_at: Optional[datetime] = Field(None, alias="lastNotifiedAt")

    class Settings:
        name = "saved_searches"
        use_state_management = True
        indexes = [
            [("userId", 1)],
        ]

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "userId": "507f1f77bcf86cd799439011",
                "name": "Kraków under 2500",
                "city": "Kraków",
                "minPrice": 1000,
                "maxPrice": 2500,
                "roomTypes": ["Single"],
                "notifyEnabled": True,
                "createdAt": "2026-07-21T10:30:00Z",
            }
        }
