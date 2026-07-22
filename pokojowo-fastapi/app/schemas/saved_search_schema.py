"""
Pydantic schemas for the saved-searches API.

Validation lives here as pure logic (field/model validators) so it can be
unit-tested by simply constructing SavedSearchCreate — no Mongo needed.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
from datetime import datetime

from app.models.listing import RoomTypeEnum, BuildingTypeEnum, RentForEnum

_ROOM_TYPES = {e.value for e in RoomTypeEnum}
_BUILDING_TYPES = {e.value for e in BuildingTypeEnum}
_RENT_FOR = {e.value for e in RentForEnum}
_OFFERED_BY = {"owner", "agency"}


class SavedSearchCreate(BaseModel):
    """Payload to create a saved search — name plus all filter fields."""
    name: str = Field(..., min_length=1, max_length=60, alias="name")
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

    class Config:
        populate_by_name = True

    @field_validator("room_types")
    @classmethod
    def _check_room_types(cls, v):
        _reject_unknown(v, _ROOM_TYPES, "roomTypes")
        return v

    @field_validator("building_types")
    @classmethod
    def _check_building_types(cls, v):
        _reject_unknown(v, _BUILDING_TYPES, "buildingTypes")
        return v

    @field_validator("rent_for")
    @classmethod
    def _check_rent_for(cls, v):
        _reject_unknown(v, _RENT_FOR, "rentFor")
        return v

    @field_validator("offered_by")
    @classmethod
    def _check_offered_by(cls, v):
        if v is not None and v not in _OFFERED_BY:
            raise ValueError(f"offeredBy must be one of {sorted(_OFFERED_BY)} or null")
        return v

    @model_validator(mode="after")
    def _check_price_range(self):
        if (
            self.min_price is not None
            and self.max_price is not None
            and self.min_price > self.max_price
        ):
            raise ValueError("minPrice must be <= maxPrice")
        return self


class SavedSearchUpdate(BaseModel):
    """Only name/notifyEnabled are editable — filter edits are delete+resave."""
    name: Optional[str] = Field(None, min_length=1, max_length=60, alias="name")
    notify_enabled: Optional[bool] = Field(None, alias="notifyEnabled")

    class Config:
        populate_by_name = True


class SavedSearchResponse(BaseModel):
    """camelCase serialization of a stored SavedSearch."""
    id: str = Field(..., alias="id")
    userId: str
    name: str
    search: Optional[str] = None
    city: Optional[str] = None
    districts: List[str] = []
    minPrice: Optional[float] = None
    maxPrice: Optional[float] = None
    minSize: Optional[float] = None
    maxSize: Optional[float] = None
    roomTypes: List[str] = []
    buildingTypes: List[str] = []
    rentFor: List[str] = []
    maxTenants: Optional[int] = None
    offeredBy: Optional[str] = None
    notifyEnabled: bool = True
    createdAt: datetime
    lastNotifiedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True


def _reject_unknown(values, allowed, field_name):
    """Raise ValueError if any entry in `values` is outside `allowed`."""
    unknown = [v for v in values if v not in allowed]
    if unknown:
        raise ValueError(
            f"{field_name} contains invalid values {unknown}; allowed: {sorted(allowed)}"
        )
