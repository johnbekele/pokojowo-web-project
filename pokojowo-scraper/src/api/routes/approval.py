"""Approval action routes."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
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


class ApprovalAction(BaseModel):
    """Approval action model."""

    listing_ids: List[str]
    action: str  # approve, reject
    reviewer: Optional[str] = "admin"
    rejection_reason: Optional[str] = None


class SingleApprovalAction(BaseModel):
    """Single listing approval action."""

    action: str  # approve, reject
    reviewer: Optional[str] = "admin"
    rejection_reason: Optional[str] = None


@router.post("/bulk")
async def bulk_approval(
    request: Request,
    approval: ApprovalAction,
):
    """Approve or reject multiple listings at once."""
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

    # Update status
    new_status = "approved" if approval.action == "approve" else "rejected"

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
):
    """Approve or reject a single listing."""
    from bson import ObjectId

    db = get_db_or_raise(request)

    if action.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    new_status = "approved" if action.action == "approve" else "rejected"

    update_doc = {
        "status": new_status,
        "reviewed_at": datetime.utcnow(),
        "reviewed_by": action.reviewer,
    }

    if action.rejection_reason:
        update_doc["rejection_reason"] = action.rejection_reason

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

    return {"message": f"Listing {new_status}", "status": new_status}


@router.post("/approve-all-pending")
async def approve_all_pending(
    request: Request,
    reviewer: str = "admin",
    limit: int = 100,
):
    """Approve all pending listings (with limit)."""
    db = get_db_or_raise(request)

    # Find pending listings
    pending = await (
        db.pending_approvals.find({"status": "pending"})
        .limit(limit)
        .to_list(limit)
    )

    if not pending:
        return {"message": "No pending listings to approve", "modified_count": 0}

    listing_ids = [str(doc["_id"]) for doc in pending]

    result = await db.pending_approvals.update_many(
        {"_id": {"$in": [doc["_id"] for doc in pending]}},
        {
            "$set": {
                "status": "approved",
                "reviewed_at": datetime.utcnow(),
                "reviewed_by": reviewer,
            }
        },
    )

    return {
        "message": f"Approved {result.modified_count} listings",
        "modified_count": result.modified_count,
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
