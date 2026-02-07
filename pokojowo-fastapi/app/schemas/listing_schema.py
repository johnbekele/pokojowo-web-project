from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class DescriptionSchema(BaseModel):
    en: str
    pl: str


class ListingBase(BaseModel):
    address: str
    price: float
    size: float
    max_tenants: int = Field(..., alias="maxTenants")
    images: List[str]
    description: dict
    available_from: datetime = Field(..., alias="availableFrom")
    room_type: str = Field(..., alias="roomType")
    building_type: str = Field(..., alias="buildingType")
    rent_for_only: List[str] = Field(..., alias="rentForOnly")
    can_be_contacted: List[str] = Field(..., alias="canBeContacted")
    close_to: Optional[List[str]] = Field(None, alias="closeTo")
    ai_help: bool = Field(False, alias="AIHelp")

    class Config:
        populate_by_name = True


class ListingCreate(ListingBase):
    pass


class ListingUpdate(BaseModel):
    address: Optional[str] = None
    price: Optional[float] = None
    size: Optional[float] = None
    max_tenants: Optional[int] = Field(None, alias="maxTenants")
    images: Optional[List[str]] = None
    description: Optional[dict] = None
    available_from: Optional[datetime] = Field(None, alias="availableFrom")
    room_type: Optional[str] = Field(None, alias="roomType")
    building_type: Optional[str] = Field(None, alias="buildingType")
    rent_for_only: Optional[List[str]] = Field(None, alias="rentForOnly")
    can_be_contacted: Optional[List[str]] = Field(None, alias="canBeContacted")
    close_to: Optional[List[str]] = Field(None, alias="closeTo")
    ai_help: Optional[bool] = Field(None, alias="AIHelp")

    class Config:
        populate_by_name = True


class ListingResponse(ListingBase):
    id: str = Field(..., alias="_id")
    owner_id: str = Field(..., alias="ownerId")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True
