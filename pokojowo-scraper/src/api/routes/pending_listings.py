"""Pending listings routes for approval queue."""

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel

router = APIRouter()


def get_db_or_raise(request: Request):
    """Get database connection or raise 503 if not available."""
    db = request.app.state.db
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not connected. Please check MongoDB configuration."
        )
    return db


class PendingListingUpdate(BaseModel):
    """Update model for pending listing."""
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    address: Optional[str] = None
    size: Optional[float] = None
    room_type: Optional[str] = None
    building_type: Optional[str] = None
    rent_for_only: Optional[List[str]] = None
    max_tenants: Optional[int] = None


@router.get("")
async def list_pending(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    status: str = "pending",
    site: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    """List pending listings for approval."""
    db = get_db_or_raise(request)

    query = {"status": status}
    if site:
        query["source_site"] = site

    sort_direction = -1 if sort_order == "desc" else 1

    cursor = (
        db.pending_approvals.find(query)
        .sort(sort_by, sort_direction)
        .skip(offset)
        .limit(limit)
    )

    listings = await cursor.to_list(length=limit)
    total = await db.pending_approvals.count_documents(query)

    # Convert ObjectId to string for JSON serialization
    for listing in listings:
        if "_id" in listing:
            listing["_id"] = str(listing["_id"])

    return {
        "listings": listings,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/queue-stats")
async def get_queue_stats(request: Request):
    """Get approval queue statistics."""
    db = get_db_or_raise(request)

    # Status counts
    pending = await db.pending_approvals.count_documents({"status": "pending"})
    approved = await db.pending_approvals.count_documents({"status": "approved"})
    rejected = await db.pending_approvals.count_documents({"status": "rejected"})

    # By source site
    site_pipeline = [
        {"$group": {"_id": "$source_site", "count": {"$sum": 1}}},
    ]
    by_site_result = await db.pending_approvals.aggregate(site_pipeline).to_list(10)
    by_site = {item["_id"]: item["count"] for item in by_site_result if item["_id"]}

    # Quality metrics
    quality_pipeline = [
        {"$match": {"status": "pending"}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "with_images": {"$sum": {"$cond": [{"$gt": [{"$size": {"$ifNull": ["$images", []]}}, 0]}, 1, 0]}},
                "avg_images": {"$avg": {"$size": {"$ifNull": ["$images", []]}}},
            }
        },
    ]
    quality_result = await db.pending_approvals.aggregate(quality_pipeline).to_list(1)

    return {
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total": pending + approved + rejected,
        "by_site": by_site,
        "quality": quality_result[0] if quality_result else {},
    }


@router.get("/search")
async def search_pending(
    request: Request,
    q: str = Query(..., min_length=2),
    limit: int = 20,
):
    """Search pending listings by address or description."""
    db = get_db_or_raise(request)

    query = {
        "$or": [
            {"address": {"$regex": q, "$options": "i"}},
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    }

    cursor = db.pending_approvals.find(query).limit(limit)
    listings = await cursor.to_list(length=limit)

    for listing in listings:
        if "_id" in listing:
            listing["_id"] = str(listing["_id"])

    return {"listings": listings, "total": len(listings)}


@router.get("/{listing_id}")
async def get_pending_listing(request: Request, listing_id: str):
    """Get a specific pending listing."""
    from bson import ObjectId

    db = get_db_or_raise(request)

    try:
        listing = await db.pending_approvals.find_one({"_id": ObjectId(listing_id)})
    except Exception:
        listing = await db.pending_approvals.find_one({"dedup_hash": listing_id})

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing["_id"] = str(listing["_id"])
    return listing


@router.put("/{listing_id}")
async def update_pending_listing(
    request: Request,
    listing_id: str,
    updates: PendingListingUpdate,
):
    """Update a pending listing."""
    from bson import ObjectId

    db = get_db_or_raise(request)

    # Build update document
    update_doc = updates.model_dump(exclude_none=True)

    if not update_doc:
        raise HTTPException(status_code=400, detail="No updates provided")

    update_doc["edited_at"] = datetime.utcnow()

    try:
        result = await db.pending_approvals.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": update_doc},
        )
    except Exception:
        result = await db.pending_approvals.update_one(
            {"dedup_hash": listing_id},
            {"$set": update_doc},
        )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")

    return {"message": "Listing updated"}
