from beanie import Document
from pydantic import Field, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


class RoomTypeEnum(str, Enum):
    SINGLE = "Single"
    DOUBLE = "Double"
    SUITE = "Suite"


class BuildingTypeEnum(str, Enum):
    APARTMENT = "Apartment"
    LOFT = "Loft"
    BLOCK = "Block"
    DETACHED_HOUSE = "Detached_House"


class RentForEnum(str, Enum):
    WOMEN = "Women"
    MAN = "Man"
    FAMILY = "Family"
    COUPLE = "Couple"
    LOCAL = "Local"
    STUDENT = "Student"
    OPEN_TO_ALL = "Open to All"


class DescriptionModel(dict):
    en: str
    pl: str


class Listing(Document):
    owner_id: str = Field(..., alias="ownerId")
    address: str
    price: float
    size: float
    max_tenants: int = Field(..., alias="maxTenants")
    images: List[str]
    description: dict  # Contains 'en' and 'pl' keys
    available_from: datetime = Field(..., alias="availableFrom")
    room_type: RoomTypeEnum = Field(..., alias="roomType")
    building_type: BuildingTypeEnum = Field(..., alias="buildingType")
    rent_for_only: List[RentForEnum] = Field(..., alias="rentForOnly")
    can_be_contacted: List[str] = Field(..., alias="canBeContacted")
    close_to: Optional[List[str]] = Field(None, alias="closeTo")
    ai_help: bool = Field(False, alias="AIHelp")

    # Timestamps
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow, alias="updatedAt")

    @field_validator('owner_id', mode='before')
    @classmethod
    def convert_objectid_to_str(cls, v):
        """Convert ObjectId to string if needed"""
        if isinstance(v, ObjectId):
            return str(v)
        return v

    class Settings:
        name = "listings"
        use_state_management = True

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "ownerId": "507f1f77bcf86cd799439011",
                "address": "Warsaw, Poland",
                "price": 2000,
                "size": 45,
                "maxTenants": 2,
                "images": ["/uploads/room1.jpg"],
                "description": {
                    "en": "Beautiful apartment in city center",
                    "pl": "Piękne mieszkanie w centrum miasta"
                },
                "availableFrom": "2024-01-01",
                "roomType": "Single",
                "buildingType": "Apartment",
                "rentForOnly": ["Open to All"],
                "canBeContacted": ["email", "phone"]
            }
        }
