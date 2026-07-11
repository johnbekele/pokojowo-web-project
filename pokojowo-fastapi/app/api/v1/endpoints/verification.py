"""Verification endpoints: phone (SMS OTP), landlord documents (later)."""
from fastapi import APIRouter, Depends

from app.core.dependencies import require_verified
from app.core.rate_limit import check_rate_limit
from app.models.user import User
from app.services.phone_verification_service import (
    normalize_phone,
    phone_verification_service,
)

router = APIRouter()


@router.post("/phone/start", response_model=dict)
async def start_phone_verification(
    body: dict,
    current_user: User = Depends(require_verified),
):
    """Send an OTP to the given phone number.

    Rate limited per user AND per phone number (3/hour each) — the
    per-phone key stops one attacker cycling through accounts to spam
    a victim's number with SMS.
    """
    phone = normalize_phone(body.get("phone", ""))

    await check_rate_limit(f"otp:{current_user.id}", 3)
    await check_rate_limit(f"otp:phone:{phone}", 3)

    return await phone_verification_service.start_verification(current_user, phone)


@router.post("/phone/check", response_model=dict)
async def check_phone_verification(
    body: dict,
    current_user: User = Depends(require_verified),
):
    """Check the OTP the user received. 5 attempts/hour."""
    await check_rate_limit(f"otp_check:{current_user.id}", 5)

    return await phone_verification_service.check_verification(
        current_user, body.get("code", "")
    )
