"""Core data models. Every extracted field carries provenance + confidence;
missing data stays missing — no fabricated defaults anywhere."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")

Source = Literal["structured", "regex", "llm", "geocode", "overpass", "manual"]

# Confidence assigned per provenance layer
SOURCE_CONFIDENCE: dict[str, float] = {
    "structured": 1.0,
    "regex": 0.85,
    "llm": 0.7,
    "geocode": 0.8,
    "overpass": 0.9,
    "manual": 1.0,
}


class FieldValue(BaseModel, Generic[T]):
    value: T
    source: Source
    confidence: float | None = None

    def model_post_init(self, __context: Any) -> None:
        if self.confidence is None:
            self.confidence = SOURCE_CONFIDENCE[self.source]


def fv(value: T, source: Source, confidence: float | None = None) -> FieldValue[T]:
    return FieldValue[type(value)](value=value, source=source, confidence=confidence)  # type: ignore[misc]


class GeoPrecision(str, Enum):
    EXACT = "exact"        # coordinates embedded by the source site
    STREET = "street"      # geocoded to street level
    DISTRICT = "district"  # district centroid
    CITY = "city"          # city centroid — never good enough for a map pin


class RoomType(str, Enum):
    SINGLE = "Single"
    DOUBLE = "Double"
    SUITE = "Suite"


class BuildingType(str, Enum):
    APARTMENT = "Apartment"
    LOFT = "Loft"
    BLOCK = "Block"
    DETACHED_HOUSE = "Detached_House"


class OfferedBy(str, Enum):
    OWNER = "owner"
    AGENCY = "agency"
    UNKNOWN = "unknown"


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class ExtractedListing(BaseModel):
    """A listing as assembled by the pipeline. Required: only identity fields."""

    source_url: str
    source_site: Literal["olx", "otodom"]
    source_id: str
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    title: Optional[FieldValue[str]] = None
    description_pl: Optional[FieldValue[str]] = None
    description_en: Optional[FieldValue[str]] = None
    price: Optional[FieldValue[float]] = None
    rent_extra: Optional[FieldValue[float]] = None    # czynsz administracyjny
    deposit: Optional[FieldValue[float]] = None       # kaucja
    size: Optional[FieldValue[float]] = None
    rooms: Optional[FieldValue[int]] = None
    floor: Optional[FieldValue[int]] = None
    furnished: Optional[FieldValue[bool]] = None
    address: Optional[FieldValue[str]] = None
    city: Optional[FieldValue[str]] = None
    district: Optional[FieldValue[str]] = None
    coordinates: Optional[FieldValue[Coordinates]] = None
    geo_precision: Optional[GeoPrecision] = None
    offered_by: Optional[FieldValue[OfferedBy]] = None
    phone: Optional[FieldValue[str]] = None
    images: Optional[FieldValue[list[str]]] = None
    available_from: Optional[FieldValue[datetime]] = None
    room_type: Optional[FieldValue[RoomType]] = None
    building_type: Optional[FieldValue[BuildingType]] = None
    rent_for_only: Optional[FieldValue[list[str]]] = None
    max_tenants: Optional[FieldValue[int]] = None
    close_to: Optional[FieldValue[list[str]]] = None
    posted_at: Optional[FieldValue[datetime]] = None

    translation_suspect: bool = False

    def field_items(self) -> list[tuple[str, FieldValue]]:
        """All populated FieldValue fields as (name, value) pairs."""
        out = []
        for name in type(self).model_fields:
            v = getattr(self, name)
            if isinstance(v, FieldValue):
                out.append((name, v))
        return out


class QualityScore(BaseModel):
    completeness: float  # 0..1 weighted field checklist
    confidence: float    # 0..1 completeness discounted by provenance
    gates_failed: list[str] = []

    @property
    def score(self) -> float:
        return self.confidence


RouteDecision = Literal["published", "queued", "held", "duplicate", "updated"]


class RunStats(BaseModel):
    pages_fetched: int = 0
    details_fetched: int = 0
    new: int = 0
    updated: int = 0
    skipped_seen: int = 0
    errors: int = 0
    blocked: bool = False
    published: int = 0
    queued: int = 0
    held: int = 0
    duplicates: int = 0
