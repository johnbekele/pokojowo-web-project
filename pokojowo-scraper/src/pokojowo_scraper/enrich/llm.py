"""Local-LLM fallback extraction (confidence 0.7) — one Ollama JSON call,
only for classification fields the structured+regex layers left empty."""

import json
import logging
from typing import Optional

import httpx
from pydantic import BaseModel, ValidationError

from pokojowo_scraper.config import settings
from pokojowo_scraper.schemas import BuildingType, ExtractedListing, RoomType, fv

logger = logging.getLogger(__name__)

RENT_FOR_VALUES = ["Women", "Man", "Family", "Couple", "Local", "Student", "Open to All"]


class LlmFields(BaseModel):
    room_type: Optional[str] = None       # Single | Double | Suite
    building_type: Optional[str] = None   # Apartment | Loft | Block | Detached_House
    rent_for_only: Optional[list[str]] = None
    max_tenants: Optional[int] = None
    close_to_mentions: Optional[list[str]] = None


PROMPT_TEMPLATE = """You classify Polish rental listings. Based on the listing below, reply with ONLY a JSON object (no markdown) with these keys:
- room_type: "Single" (1-person room/studio), "Double" (2-person), or "Suite" (3+ rooms / whole large flat), or null if unclear
- building_type: "Apartment", "Loft", "Block" (blok/wielka płyta), or "Detached_House" (dom), or null
- rent_for_only: array from {rent_for_values}, or null. Only include restrictions the text states (e.g. "tylko dla kobiet" -> ["Women"], "dla studentów" -> ["Student"]). If no restriction, null.
- max_tenants: integer or null
- close_to_mentions: array of nearby places the text explicitly mentions (e.g. "metro", "park", "uniwersytet"), or null

Listing:
Title: {title}
Rooms: {rooms}
Size: {size} m2
Description: {description}
"""


async def llm_fill_gaps(listing: ExtractedListing) -> ExtractedListing:
    """Fill classification gaps via local LLM. Never overwrites existing values."""
    needs = (
        listing.room_type is None
        or listing.building_type is None
        or listing.rent_for_only is None
        or listing.max_tenants is None
    )
    if not needs or not listing.description_pl:
        return listing

    prompt = PROMPT_TEMPLATE.format(
        rent_for_values=json.dumps(RENT_FOR_VALUES),
        title=listing.title.value if listing.title else "",
        rooms=listing.rooms.value if listing.rooms else "?",
        size=listing.size.value if listing.size else "?",
        description=listing.description_pl.value[:3000],
    )

    raw = await _ollama_json(prompt)
    if raw is None:
        return listing
    try:
        fields = LlmFields.model_validate(raw)
    except ValidationError:
        logger.warning("LLM returned invalid schema, retrying once")
        raw = await _ollama_json(prompt)
        if raw is None:
            return listing
        try:
            fields = LlmFields.model_validate(raw)
        except ValidationError:
            logger.warning("LLM schema invalid twice — leaving fields empty")
            return listing

    if listing.room_type is None and fields.room_type in RoomType._value2member_map_:
        listing.room_type = fv(RoomType(fields.room_type), "llm")
    if listing.building_type is None and fields.building_type in BuildingType._value2member_map_:
        listing.building_type = fv(BuildingType(fields.building_type), "llm")
    if listing.rent_for_only is None and fields.rent_for_only:
        valid = [v for v in fields.rent_for_only if v in RENT_FOR_VALUES]
        if valid:
            listing.rent_for_only = fv(valid, "llm")
    if listing.max_tenants is None and fields.max_tenants and 1 <= fields.max_tenants <= 20:
        listing.max_tenants = fv(fields.max_tenants, "llm")
    if fields.close_to_mentions:
        mentions = [m.strip() for m in fields.close_to_mentions if m.strip()][:10]
        if mentions:
            existing = listing.close_to.value if listing.close_to else []
            merged = existing + [m for m in mentions if m not in existing]
            listing.close_to = fv(merged, "llm")
    return listing


async def _ollama_json(prompt: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            resp = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0},
                },
            )
            resp.raise_for_status()
            return json.loads(resp.json().get("response", ""))
    except (httpx.HTTPError, json.JSONDecodeError) as e:
        logger.error("ollama JSON extraction failed: %s", e)
        return None
