"""Geo helpers shared by the map endpoints.

Coordinates are stored as GeoJSON `[lng, lat]` on `Listing.locationGeo`
(2dsphere-indexed, queried directly) and on
`User.tenantProfile.preferences.locationGeo` (filtered in memory from the
scored-match cache, so it needs no index).
"""
import hashlib
import math
from enum import Enum
from typing import NamedTuple, Optional

from fastapi import HTTPException, status


class GeoPrecision(str, Enum):
    """How exactly a stored point matches the place it describes.

    Ordered least → most precise; `EXACT` means the coordinates came from
    the source (a scraped site, or a landlord dropping a pin) rather than
    from geocoding a text string.
    """
    CITY = "city"
    DISTRICT = "district"
    STREET = "street"
    EXACT = "exact"


_PRECISION_ORDER = [
    GeoPrecision.CITY,
    GeoPrecision.DISTRICT,
    GeoPrecision.STREET,
    GeoPrecision.EXACT,
]


def precision_rank(precision: Optional[str]) -> int:
    """-1 for unknown/missing so anything real beats it."""
    try:
        return _PRECISION_ORDER.index(GeoPrecision(precision))
    except (ValueError, TypeError):
        return -1


class BoundingBox(NamedTuple):
    sw_lng: float
    sw_lat: float
    ne_lng: float
    ne_lat: float


def parse_bbox(raw: str) -> BoundingBox:
    """Parse a `swLng,swLat,neLng,neLat` query string."""
    parts = [p.strip() for p in (raw or "").split(",")]
    if len(parts) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bbox must be 'swLng,swLat,neLng,neLat'",
        )
    try:
        sw_lng, sw_lat, ne_lng, ne_lat = (float(p) for p in parts)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bbox values must be numbers",
        )

    if not (-180 <= sw_lng <= 180 and -180 <= ne_lng <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bbox longitudes must be between -180 and 180",
        )
    if not (-90 <= sw_lat <= 90 and -90 <= ne_lat <= 90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bbox latitudes must be between -90 and 90",
        )
    if sw_lat > ne_lat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bbox south latitude must be below the north latitude",
        )
    # A map panned past the antimeridian can report sw_lng > ne_lng. Poland is
    # nowhere near it, so clamp to the whole world rather than split the query.
    if sw_lng > ne_lng:
        sw_lng, ne_lng = -180.0, 180.0

    return BoundingBox(sw_lng, sw_lat, ne_lng, ne_lat)


def bbox_clause(bbox: BoundingBox, field: str = "locationGeo") -> dict:
    """A `$geoWithin` clause usable with a 2dsphere index.

    Uses a GeoJSON polygon rather than the legacy `$box`, which only
    2d indexes support.
    """
    ring = [
        [bbox.sw_lng, bbox.sw_lat],
        [bbox.ne_lng, bbox.sw_lat],
        [bbox.ne_lng, bbox.ne_lat],
        [bbox.sw_lng, bbox.ne_lat],
        [bbox.sw_lng, bbox.sw_lat],
    ]
    return {
        field: {
            "$geoWithin": {"$geometry": {"type": "Polygon", "coordinates": [ring]}}
        }
    }


def point_in_bbox(bbox: BoundingBox, lng: float, lat: float) -> bool:
    return (
        bbox.sw_lng <= lng <= bbox.ne_lng
        and bbox.sw_lat <= lat <= bbox.ne_lat
    )


# Below this zoom individual pins are meaningless — a city-wide view would
# ship thousands of overlapping bubbles — so the API returns cluster counts.
CLUSTER_ZOOM_THRESHOLD = 13


def cluster_cell_size(zoom: int) -> float:
    """Grid cell size in degrees for the given map zoom.

    A quarter of a tile keeps bubbles far enough apart to stay readable
    while still collapsing a full-screen view into a handful of them.
    """
    zoom = max(0, min(int(zoom), 20))
    return 360.0 / (2 ** zoom) / 4


def coords_from_geo(location_geo) -> Optional[tuple]:
    """Extract `(lng, lat)` from a GeoJSON point, or None when unusable."""
    if not isinstance(location_geo, dict):
        return None
    coords = location_geo.get("coordinates")
    if not isinstance(coords, (list, tuple)) or len(coords) < 2:
        return None
    lng, lat = coords[0], coords[1]
    if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
        return None
    if isinstance(lng, bool) or isinstance(lat, bool):
        return None
    return float(lng), float(lat)


def to_geojson_point(latitude: float, longitude: float) -> dict:
    return {"type": "Point", "coordinates": [longitude, latitude]}


# Flatmate pins mark a *preferred area*, never a home address, and many
# users pick the same district — so pins would stack on one centroid.
SCATTER_RADIUS_METRES = 300
_METRES_PER_DEGREE_LAT = 111_320


def scatter_point(lng: float, lat: float, seed: str) -> tuple:
    """Offset a point deterministically by up to `SCATTER_RADIUS_METRES`.

    Deterministic so a given user's pin doesn't jump between requests.
    """
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    # Two independent [0, 1) values from separate byte ranges
    angle = int.from_bytes(digest[:4], "big") / 0xFFFFFFFF * 2 * math.pi
    # sqrt keeps the distribution uniform over the disc instead of
    # bunching points near the centre
    distance = math.sqrt(int.from_bytes(digest[4:8], "big") / 0xFFFFFFFF)
    distance *= SCATTER_RADIUS_METRES

    d_lat = distance * math.sin(angle) / _METRES_PER_DEGREE_LAT
    cos_lat = math.cos(math.radians(lat))
    metres_per_degree_lng = _METRES_PER_DEGREE_LAT * max(abs(cos_lat), 0.01)
    d_lng = distance * math.cos(angle) / metres_per_degree_lng

    return lng + d_lng, lat + d_lat
