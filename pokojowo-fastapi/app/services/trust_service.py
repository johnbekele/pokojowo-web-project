"""Computed trust score and trust level.

trust_score is NEVER accepted as input from any client — it is
recomputed from verifiable state on the events that change it (email
verify, phone verify, landlord doc review, profile save, photo upload).
"""
from datetime import datetime, timedelta
from typing import Literal

from app.models.user import RoleEnum, User

ACCOUNT_AGE_BONUS_DAYS = 90

# Component weights (sum for a fully-verified landlord = 110, capped 100;
# tenants top out at 75 by design — the landlord-docs component doesn't
# apply to them)
POINTS_EMAIL = 20
POINTS_PHONE = 25
POINTS_LANDLORD_DOCS = 30
POINTS_PROFILE_COMPLETE = 15
POINTS_PHOTO = 10
POINTS_ACCOUNT_AGE = 5


def _is_landlord_docs_approved(user: User) -> bool:
    return bool(
        user.landlord_profile
        and user.landlord_profile.verification
        and user.landlord_profile.verification.is_verified_landlord
    )


def compute_trust_score(user: User, now: datetime = None) -> int:
    """Pure function of the user's verifiable state -> 0-100."""
    now = now or datetime.utcnow()
    score = 0

    if user.is_verified:
        score += POINTS_EMAIL
    if getattr(user, "phone_verified", False):
        score += POINTS_PHONE
    if RoleEnum.LANDLORD in user.role and _is_landlord_docs_approved(user):
        score += POINTS_LANDLORD_DOCS

    # Profile completeness, prorated from the existing 0-100 step score
    completion = user.profile_completion_step or 0
    score += round(POINTS_PROFILE_COMPLETE * min(completion, 100) / 100)

    if user.photo and user.photo.url:
        score += POINTS_PHOTO

    if user.created_at and (now - user.created_at) >= timedelta(days=ACCOUNT_AGE_BONUS_DAYS):
        score += POINTS_ACCOUNT_AGE

    return min(100, score)


def trust_level(user: User) -> Literal["unverified", "verified", "id_verified"]:
    """Badge tier: verified = email+phone; id_verified = landlord docs
    approved (implies the strongest badge regardless of phone)."""
    if RoleEnum.LANDLORD in user.role and _is_landlord_docs_approved(user):
        return "id_verified"
    if user.is_verified and getattr(user, "phone_verified", False):
        return "verified"
    return "unverified"


async def recompute_trust_score(user: User) -> int:
    """Recompute and persist. Call after any event that changes inputs."""
    score = compute_trust_score(user)
    if user.trust_score != score:
        user.trust_score = score
        await user.save()
    return score
