"""
Notifications API endpoints for managing user notifications.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.notification_service import notification_service

router = APIRouter()


@router.get("/", response_model=dict)
async def get_notifications(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user)
):
    """
    Get notifications for the current user.

    Returns a list of notifications with metadata including unread count.
    """
    result = await notification_service.get_user_notifications(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset,
        unread_only=unread_only
    )
    return result


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: User = Depends(get_current_user)
):
    """
    Get the count of unread notifications.
    """
    count = await notification_service.get_unread_count(str(current_user.id))
    return {"unread_count": count}


@router.post("/{notification_id}/read", response_model=dict)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Mark a specific notification as read.
    """
    success = await notification_service.mark_as_read(
        notification_id=notification_id,
        user_id=str(current_user.id)
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return {"status": "success", "message": "Notification marked as read"}


@router.post("/read-all", response_model=dict)
async def mark_all_read(
    current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user.
    """
    count = await notification_service.mark_all_as_read(str(current_user.id))
    return {"status": "success", "marked_count": count}


@router.delete("/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a notification.
    """
    success = await notification_service.delete_notification(
        notification_id=notification_id,
        user_id=str(current_user.id)
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return {"status": "success", "message": "Notification deleted"}
