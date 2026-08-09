"""
Admin API endpoints for administrative tasks.
"""

from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.user import User, RoleEnum
from app.core.config import settings
from app.core.dependencies import get_current_user, require_role
from app.models.notification import NotificationTypeEnum
from app.services.notification_service import notification_service
from app.services.seeding_service import seeding_service

router = APIRouter()


def _report_user_query_ids(reports) -> list:
    """Convert report IDs into values Mongo can match against ``User._id``.

    Report IDs are stored as strings for API portability. Current users use
    ObjectIds, but keeping non-ObjectId values in the query preserves support
    for legacy/test documents that used string IDs.
    """
    raw_ids = {
        user_id
        for report in reports
        for user_id in (report.reporter_id, report.reported_user_id)
        if user_id
    }
    query_ids = []
    for user_id in raw_ids:
        try:
            query_ids.append(ObjectId(str(user_id)))
        except (InvalidId, TypeError):
            query_ids.append(user_id)
    return query_ids


# ---------------------------------------------------------------------------
# Landlord verification review (Admin only)
# NOTE: static paths must stay above any future /{user_id} routes.
# ---------------------------------------------------------------------------

@router.get("/verification-queue", response_model=dict)
async def verification_queue(
    current_user: User = Depends(require_role(RoleEnum.ADMIN.value)),
):
    """Landlords with at least one pending verification document."""
    users = await User.find(
        {"landlordProfile.verification.verificationDocuments.status": "pending"}
    ).to_list(length=200)

    queue = []
    for user in users:
        verification = user.landlord_profile.verification
        pending = [d for d in verification.verification_documents if d.status == "pending"]
        queue.append({
            "user_id": str(user.id),
            "username": user.username,
            "firstname": user.firstname,
            "lastname": user.lastname,
            "email": user.email,
            "isVerifiedLandlord": verification.is_verified_landlord,
            "pendingDocuments": [
                {
                    "id": d.id,
                    "type": d.type,
                    "uploadedAt": d.uploaded_at,
                }
                for d in pending
            ],
        })

    return {"queue": queue, "count": len(queue)}


async def _review_landlord(user_id: str, approve: bool, reason: str, reviewer: User) -> dict:
    user = await User.get(user_id)
    verification = (
        user.landlord_profile.verification
        if user and user.landlord_profile and user.landlord_profile.verification
        else None
    )
    if not verification or not verification.verification_documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verification documents for this user",
        )

    now = datetime.utcnow()
    reviewed = 0
    for doc in verification.verification_documents:
        if doc.status == "pending":
            doc.status = "approved" if approve else "rejected"
            doc.rejection_reason = None if approve else reason
            doc.reviewed_at = now
            doc.reviewed_by = str(reviewer.id)
            reviewed += 1

    if reviewed == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending documents to review",
        )

    if approve:
        verification.is_verified_landlord = True

    await user.save()

    # Trust score reflects the new verification state
    from app.services.trust_service import recompute_trust_score
    await recompute_trust_score(user)

    await notification_service.store_notification(
        user_id=str(user.id),
        notification_type=NotificationTypeEnum.SYSTEM,
        title="Landlord verification " + ("approved" if approve else "rejected"),
        message=(
            "Your landlord verification was approved — your listings now show the ID Verified badge."
            if approve
            else f"Your verification was rejected: {reason}. You can upload new documents."
        ),
    )

    return {
        "message": "approved" if approve else "rejected",
        "user_id": user_id,
        "documents_reviewed": reviewed,
        "isVerifiedLandlord": verification.is_verified_landlord,
    }


@router.post("/verification/{user_id}/approve", response_model=dict)
async def approve_landlord_verification(
    user_id: str,
    current_user: User = Depends(require_role(RoleEnum.ADMIN.value)),
):
    """Approve all pending documents and flip is_verified_landlord."""
    return await _review_landlord(user_id, approve=True, reason="", reviewer=current_user)


@router.post("/verification/{user_id}/reject", response_model=dict)
async def reject_landlord_verification(
    user_id: str,
    body: dict,
    current_user: User = Depends(require_role(RoleEnum.ADMIN.value)),
):
    """Reject pending documents with a reason; landlord may re-upload."""
    reason = (body.get("reason") or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rejection reason is required",
        )
    return await _review_landlord(user_id, approve=False, reason=reason, reviewer=current_user)


@router.post("/seed-listings", response_model=dict)
async def seed_listings(
    clear_existing: bool = Query(
        False,
        description="If true, delete existing listings for this owner before seeding"
    ),
    current_user: User = Depends(get_current_user)
):
    """
    Seed listings from JSON file.

    Creates sample listings from the seed data file.
    Only available to Admin or Landlord users.

    The seeded listings will be owned by the current user.
    """
    # Check permissions
    has_permission = (
        current_user.has_role(RoleEnum.ADMIN) or
        current_user.has_role(RoleEnum.LANDLORD)
    )

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Landlord role required to seed listings"
        )

    result = await seeding_service.seed_listings(
        owner_id=str(current_user.id),
        clear_existing=clear_existing
    )

    if not result.get("success", False) and "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )

    return result


@router.get("/seed-stats", response_model=dict)
async def get_seed_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about available seed data.

    Returns information about what seed data is available
    without actually seeding anything.
    """
    # Check permissions
    has_permission = (
        current_user.has_role(RoleEnum.ADMIN) or
        current_user.has_role(RoleEnum.LANDLORD)
    )

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Landlord role required"
        )

    return await seeding_service.get_seed_stats()


@router.get("/system-stats", response_model=dict)
async def get_system_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get system statistics.

    Returns counts of users, listings, chats, etc.
    Only available to Admin users.
    """
    if not current_user.has_role(RoleEnum.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )

    from app.models.listing import Listing
    import httpx

    # Get counts
    total_users = await User.count()
    total_listings = await Listing.count()

    total_chats = 0
    total_messages = 0
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.CHAT_SERVICE_URL}/health/stats")
            if resp.status_code == 200:
                chat_stats = resp.json()
                total_chats = chat_stats.get("total_chats", 0)
                total_messages = chat_stats.get("total_messages", 0)
    except Exception:
        pass

    # Get users by role
    tenants = await User.find({"role": RoleEnum.TENANT}).count()
    landlords = await User.find({"role": RoleEnum.LANDLORD}).count()
    admins = await User.find({"role": RoleEnum.ADMIN}).count()

    # Get completed profiles
    completed_profiles = await User.find({"is_profile_complete": True}).count()

    return {
        "users": {
            "total": total_users,
            "tenants": tenants,
            "landlords": landlords,
            "admins": admins,
            "completed_profiles": completed_profiles,
        },
        "listings": {
            "total": total_listings,
        },
        "chat": {
            "total_chats": total_chats,
            "total_messages": total_messages,
        },
    }


# ---------------------------------------------------------------------------
# Reports + user moderation (Admin only)
# ---------------------------------------------------------------------------

from app.models.report import Report, ReportStatusEnum


@router.get("/reports", response_model=dict)
async def list_reports(
    status_filter: str = Query("open", description="open|resolved|dismissed|all"),
    current_user: User = Depends(require_role(RoleEnum.ADMIN.value)),
):
    """Reports queue for moderation."""
    query = {}
    if status_filter != "all":
        query["status"] = status_filter

    reports = await Report.find(query).sort("-createdAt").to_list(length=200)

    # Resolve every reporter/reported user with one batched query instead of
    # two sequential lookups per report. Missing users remain represented by
    # null enrichment fields below, just as they were before.
    users_by_id = {}
    user_query_ids = _report_user_query_ids(reports)
    if user_query_ids:
        users = await User.find({"_id": {"$in": user_query_ids}}).to_list()
        users_by_id = {str(user.id): user for user in users}

    enriched = []
    for report in reports:
        reported = users_by_id.get(str(report.reported_user_id))
        reporter = users_by_id.get(str(report.reporter_id))
        enriched.append({
            "id": str(report.id),
            "reason": report.reason.value,
            "details": report.details,
            "status": report.status.value,
            "createdAt": report.created_at,
            "reported": {
                "user_id": report.reported_user_id,
                "username": reported.username if reported else None,
                "isActive": reported.is_active if reported else None,
            },
            "reporter": {
                "user_id": report.reporter_id,
                "username": reporter.username if reporter else None,
            },
        })

    return {"reports": enriched, "count": len(enriched)}


@router.post("/reports/{report_id}/resolve", response_model=dict)
async def resolve_report(
    report_id: str,
    body: dict,
    current_user: User = Depends(require_role(RoleEnum.ADMIN.value)),
):
    """Mark a report resolved or dismissed."""
    outcome = body.get("outcome", "resolved")
    if outcome not in ("resolved", "dismissed"):
        raise HTTPException(status_code=422, detail="outcome must be resolved or dismissed")

    report = await Report.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = ReportStatusEnum(outcome)
    report.resolved_by = str(current_user.id)
    report.resolved_at = datetime.utcnow()
    await report.save()

    return {"message": outcome, "report_id": report_id}


@router.post("/users/{user_id}/ban", response_model=dict)
async def ban_user(
    user_id: str,
    current_user: User = Depends(require_role(RoleEnum.ADMIN.value)),
):
    """Deactivate a user account (is_active=False fails every request
    at the auth dependency). The legacy `freez` field stays unused."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if RoleEnum.ADMIN in user.role:
        raise HTTPException(status_code=400, detail="Cannot ban an admin")

    user.is_active = False
    await user.save()

    from app.services import matching_cache
    matching_cache.clear()

    return {"message": "User banned", "user_id": user_id}


@router.post("/users/{user_id}/unban", response_model=dict)
async def unban_user(
    user_id: str,
    current_user: User = Depends(require_role(RoleEnum.ADMIN.value)),
):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    await user.save()
    return {"message": "User unbanned", "user_id": user_id}
