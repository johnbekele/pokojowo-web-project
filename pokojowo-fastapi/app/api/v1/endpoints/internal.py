"""Service-to-service internal endpoints for the chat microservice."""
from fastapi import APIRouter, Depends, HTTPException, Header, status, Query
from typing import Optional

from app.core.config import settings
from app.core.blocking import is_blocked_between
from app.models.user import User

router = APIRouter()


async def verify_internal_key(x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key")):
    expected = settings.INTERNAL_API_KEY
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal API not configured",
        )
    if x_internal_key != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal API key")


@router.get("/users/batch")
async def get_users_batch(
    ids: str = Query(..., description="Comma-separated user IDs"),
    _: None = Depends(verify_internal_key),
):
    user_ids = [uid.strip() for uid in ids.split(",") if uid.strip()]
    if not user_ids:
        return {"users": []}

    users = []
    for uid in user_ids:
        user = await User.get(uid)
        if user and user.is_active:
            users.append({
                "id": str(user.id),
                "firstname": user.firstname,
                "lastname": user.lastname,
                "photo": user.photo,
                "isOnline": getattr(user, "is_online", False),
                "isVerified": user.is_verified,
            })
    return {"users": users}


@router.get("/users/block-check")
async def block_check(
    user_a: str = Query(...),
    user_b: str = Query(...),
    _: None = Depends(verify_internal_key),
):
    a = await User.get(user_a)
    b = await User.get(user_b)
    if not a or not b:
        return {"blocked": False}
    return {"blocked": is_blocked_between(a, b)}


@router.get("/users/{user_id}/verified")
async def user_verified(user_id: str, _: None = Depends(verify_internal_key)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"verified": user.is_verified, "active": user.is_active}
