"""Approval action routes with direct MongoDB publishing to main Pokojowo database."""

import logging
from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

# Main Pokojowo database connection (direct access)
POKOJOWO_MONGODB_URL = "mongodb+srv://john:pass123@cluster3.ubson3n.mongodb.net/test?appName=Cluster3&tlsAllowInvalidCertificates=true"
_pokojowo_client: Optional[AsyncIOMotorClient] = None
_pokojowo_db = None


async def get_pokojowo_db():
    """Get connection to main Pokojowo database."""
    global _pokojowo_client, _pokojowo_db
    if _pokojowo_client is None:
        _pokojowo_client = AsyncIOMotorClient(POKOJOWO_MONGODB_URL)
        _pokojowo_db = _pokojowo_client.test  # 'test' database
        logger.info("Connected to main Pokojowo database")
    return _pokojowo_db


def get_db_or_raise(request: Request):
    """Get scraper database connection or raise 503 if not available."""
    db = request.app.state.db
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not connected. Please check MongoDB configuration."
        )
    return db


async def publish_to_pokojowo(listing: dict) -> dict:
    """
    Publish an approved scraped listing directly to the main Pokojowo MongoDB.
    No API call needed - writes directly to the listings collection.

    Returns: {"success": bool, "listing_id": str or None, "error": str or None}
    """
    try:
        db = await get_pokojowo_db()

        # Check for duplicate by sourceUrl (using Beanie alias)
        existing = await db.listings.find_one({"sourceUrl": listing.get("source_url")})
        if existing:
            logger.info(f"Listing already exists in Pokojowo: {existing['_id']}")
            return {
                "success": True,
                "listing_id": str(existing["_id"]),
                "error": None,
                "duplicate": True
            }

        # Transform scraped data to Pokojowo listing format
        description = listing.get("description", {})
        if isinstance(description, str):
            description = {"pl": description, "en": ""}

        # Handle availableFrom date
        available_from = listing.get("available_from")
        if not isinstance(available_from, datetime):
            available_from = datetime.utcnow()

        # Valid enum values (must match Beanie model)
        valid_room_types = {"Single", "Double", "Suite"}
        valid_building_types = {"Apartment", "Loft", "Block", "Detached_House"}
        valid_rent_for = {"Women", "Man", "Family", "Couple", "Local", "Student", "Open to All"}

        # Normalize room type
        raw_room_type = listing.get("room_type", "Single")
        if raw_room_type not in valid_room_types:
            if "triple" in str(raw_room_type).lower() or "3" in str(raw_room_type):
                raw_room_type = "Suite"
            elif "double" in str(raw_room_type).lower() or "2" in str(raw_room_type):
                raw_room_type = "Double"
            else:
                raw_room_type = "Single"

        # Normalize building type
        raw_building_type = listing.get("building_type", "Apartment")
        if raw_building_type not in valid_building_types:
            raw_building_type = "Apartment"

        # Normalize rent_for_only
        raw_rent_for = listing.get("rent_for_only", ["Open to All"])
        rent_for_only = [r if r in valid_rent_for else "Open to All" for r in raw_rent_for]
        if not rent_for_only:
            rent_for_only = ["Open to All"]

        # Build the listing document matching Pokojowo schema (using Beanie aliases)
        listing_doc = {
            "ownerId": "scraped",  # Special owner for scraped listings
            "address": listing.get("address", ""),
            "price": float(listing.get("price", 0)),
            "size": float(listing.get("size", 0)),
            "maxTenants": int(listing.get("max_tenants", 1)),
            "images": listing.get("images", []),
            "description": description,
            "availableFrom": available_from,
            "roomType": raw_room_type,
            "buildingType": raw_building_type,
            "rentForOnly": rent_for_only,
            "canBeContacted": listing.get("can_be_contacted", ["Message"]),
            "closeTo": listing.get("close_to", []),
            "AIHelp": listing.get("ai_help", False),
            # Scraped listing specific fields
            "isScraped": True,
            "sourceUrl": listing.get("source_url", ""),
            "sourceSite": listing.get("source_site", "unknown"),
            "phone": listing.get("phone"),
            # Timestamps
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }

        logger.info(f"Publishing to Pokojowo DB: {listing.get('title', '')[:50]}")

        result = await db.listings.insert_one(listing_doc)
        listing_id = str(result.inserted_id)

        logger.info(f"Successfully published listing to Pokojowo: {listing_id}")
        return {"success": True, "listing_id": listing_id, "error": None, "duplicate": False}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error publishing listing to Pokojowo: {error_msg}")
        return {"success": False, "listing_id": None, "error": error_msg}


class ApprovalAction(BaseModel):
    """Approval action model."""

    listing_ids: List[str]
    action: str  # approve, reject
    reviewer: Optional[str] = "admin"
    rejection_reason: Optional[str] = None
    publish: bool = True  # Whether to publish approved listings to Pokojowo


class SingleApprovalAction(BaseModel):
    """Single listing approval action."""

    action: str  # approve, reject
    reviewer: Optional[str] = "admin"
    rejection_reason: Optional[str] = None
    publish: bool = True  # Whether to publish approved listings to Pokojowo


@router.post("/bulk")
async def bulk_approval(
    request: Request,
    approval: ApprovalAction,
):
    """Approve or reject multiple listings at once. Publishes directly to Pokojowo DB on approval."""
    from bson import ObjectId

    db = get_db_or_raise(request)

    if approval.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Convert string IDs to ObjectIds
    object_ids = []
    for lid in approval.listing_ids:
        try:
            object_ids.append(ObjectId(lid))
        except Exception:
            pass  # Skip invalid IDs

    if not object_ids:
        raise HTTPException(status_code=400, detail="No valid listing IDs provided")

    new_status = "approved" if approval.action == "approve" else "rejected"

    # Track publishing results
    published_count = 0
    publish_errors = []

    # If approving and publish is enabled, publish each listing to Pokojowo
    if approval.action == "approve" and approval.publish:
        listings = await db.pending_approvals.find(
            {"_id": {"$in": object_ids}}
        ).to_list(len(object_ids))

        for listing in listings:
            result = await publish_to_pokojowo(listing)

            update_doc = {
                "status": new_status,
                "reviewed_at": datetime.utcnow(),
                "reviewed_by": approval.reviewer,
            }

            if result["success"]:
                published_count += 1
                update_doc["pokojowo_listing_id"] = result["listing_id"]
                update_doc["published_at"] = datetime.utcnow()
                update_doc["publish_error"] = None
            else:
                publish_errors.append({
                    "listing_id": str(listing["_id"]),
                    "error": result["error"]
                })
                update_doc["publish_error"] = result["error"]

            await db.pending_approvals.update_one(
                {"_id": listing["_id"]},
                {"$set": update_doc}
            )

        return {
            "message": f"{len(listings)} listings {new_status}, {published_count} published to Pokojowo",
            "modified_count": len(listings),
            "published_count": published_count,
            "publish_errors": publish_errors if publish_errors else None,
        }
    else:
        # Just update status without publishing
        update_doc = {
            "status": new_status,
            "reviewed_at": datetime.utcnow(),
            "reviewed_by": approval.reviewer,
        }

        if approval.rejection_reason:
            update_doc["rejection_reason"] = approval.rejection_reason

        result = await db.pending_approvals.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": update_doc},
        )

        return {
            "message": f"{result.modified_count} listings {new_status}",
            "modified_count": result.modified_count,
        }


@router.post("/{listing_id}")
async def approve_single(
    request: Request,
    listing_id: str,
    action: SingleApprovalAction,
    background_tasks: BackgroundTasks,
):
    """Approve or reject a single listing. Publishes directly to Pokojowo DB on approval."""
    from bson import ObjectId

    db = get_db_or_raise(request)

    if action.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    new_status = "approved" if action.action == "approve" else "rejected"

    # First, get the listing data (needed for publishing)
    listing = None
    try:
        listing = await db.pending_approvals.find_one({"_id": ObjectId(listing_id)})
    except Exception:
        listing = await db.pending_approvals.find_one({"dedup_hash": listing_id})

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    update_doc = {
        "status": new_status,
        "reviewed_at": datetime.utcnow(),
        "reviewed_by": action.reviewer,
    }

    if action.rejection_reason:
        update_doc["rejection_reason"] = action.rejection_reason

    # If approving and publish is enabled, publish directly to Pokojowo DB
    publish_result = None
    if action.action == "approve" and action.publish:
        publish_result = await publish_to_pokojowo(listing)

        if publish_result["success"]:
            update_doc["pokojowo_listing_id"] = publish_result["listing_id"]
            update_doc["published_at"] = datetime.utcnow()
            update_doc["publish_error"] = None
        else:
            update_doc["publish_error"] = publish_result["error"]

    # Update the listing status in scraper DB
    try:
        await db.pending_approvals.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": update_doc},
        )
    except Exception:
        await db.pending_approvals.update_one(
            {"dedup_hash": listing_id},
            {"$set": update_doc},
        )

    response = {
        "message": f"Listing {new_status}",
        "status": new_status,
    }

    if publish_result:
        response["published"] = publish_result["success"]
        response["pokojowo_listing_id"] = publish_result.get("listing_id")
        if publish_result.get("error"):
            response["publish_error"] = publish_result["error"]

    return response


@router.post("/approve-all-pending")
async def approve_all_pending(
    request: Request,
    reviewer: str = "admin",
    limit: int = 100,
    publish: bool = True,
):
    """Approve all pending listings and publish to Pokojowo (with limit)."""
    db = get_db_or_raise(request)

    # Find pending listings
    pending = await (
        db.pending_approvals.find({"status": "pending"})
        .limit(limit)
        .to_list(limit)
    )

    if not pending:
        return {"message": "No pending listings to approve", "modified_count": 0}

    published_count = 0
    listing_ids = []

    for listing in pending:
        listing_ids.append(str(listing["_id"]))

        update_doc = {
            "status": "approved",
            "reviewed_at": datetime.utcnow(),
            "reviewed_by": reviewer,
        }

        if publish:
            result = await publish_to_pokojowo(listing)
            if result["success"]:
                published_count += 1
                update_doc["pokojowo_listing_id"] = result["listing_id"]
                update_doc["published_at"] = datetime.utcnow()
                update_doc["publish_error"] = None
            else:
                update_doc["publish_error"] = result["error"]

        await db.pending_approvals.update_one(
            {"_id": listing["_id"]},
            {"$set": update_doc}
        )

    return {
        "message": f"Approved {len(pending)} listings, {published_count} published to Pokojowo",
        "modified_count": len(pending),
        "published_count": published_count,
        "listing_ids": listing_ids,
    }


@router.get("/publishing-status")
async def get_publishing_status(request: Request):
    """Get status of published listings."""
    db = get_db_or_raise(request)

    # Count published
    published = await db.pending_approvals.count_documents(
        {"pokojowo_listing_id": {"$ne": None}}
    )

    # Count with errors
    with_errors = await db.pending_approvals.count_documents(
        {"publish_error": {"$ne": None}}
    )

    # Recent publications
    recent = await (
        db.pending_approvals.find({"pokojowo_listing_id": {"$ne": None}})
        .sort("published_at", -1)
        .limit(10)
        .to_list(10)
    )

    for r in recent:
        r["_id"] = str(r["_id"])

    return {
        "published": published,
        "with_errors": with_errors,
        "recent": recent,
    }
