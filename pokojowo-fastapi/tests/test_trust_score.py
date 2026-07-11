"""Unit tests for the computed trust score and trust level."""
from datetime import datetime

import pytest

from app.models.user import (
    LandlordProfileModel,
    PhotoModel,
    RoleEnum,
    User,
    VerificationModel,
)
from app.services.trust_service import compute_trust_score, trust_level

NOW = datetime(2026, 7, 11)


def build_user(
    *,
    roles=None,
    is_verified=False,
    phone_verified=False,
    landlord_docs_approved=False,
    completion=0,
    has_photo=False,
    created_at=None,
) -> User:
    landlord_profile = None
    if landlord_docs_approved or (roles and RoleEnum.LANDLORD in roles):
        landlord_profile = LandlordProfileModel(
            verification=VerificationModel(is_verified_landlord=landlord_docs_approved)
        )
    return User.model_construct(
        username="u",
        email="u@example.com",
        role=roles or [RoleEnum.USER, RoleEnum.TENANT],
        is_verified=is_verified,
        phone_verified=phone_verified,
        landlord_profile=landlord_profile,
        profile_completion_step=completion,
        photo=PhotoModel(url="/uploads/photo/x.png") if has_photo else None,
        created_at=created_at or NOW,  # brand new by default
    )


def test_blank_user_scores_zero():
    assert compute_trust_score(build_user(), now=NOW) == 0


def test_each_component():
    assert compute_trust_score(build_user(is_verified=True), now=NOW) == 20
    assert compute_trust_score(build_user(phone_verified=True), now=NOW) == 25
    assert compute_trust_score(build_user(completion=100), now=NOW) == 15
    assert compute_trust_score(build_user(completion=50), now=NOW) == 8  # prorated
    assert compute_trust_score(build_user(has_photo=True), now=NOW) == 10
    assert compute_trust_score(build_user(created_at=datetime(2026, 1, 1)), now=NOW) == 5


def test_landlord_docs_only_count_for_landlords():
    landlord = build_user(
        roles=[RoleEnum.USER, RoleEnum.LANDLORD], landlord_docs_approved=True
    )
    assert compute_trust_score(landlord, now=NOW) == 30

    # A tenant with (somehow) an approved landlord verification gets nothing
    tenant = build_user(landlord_docs_approved=True)
    assert compute_trust_score(tenant, now=NOW) == 0


def test_tenant_max_is_70():
    tenant = build_user(
        is_verified=True,
        phone_verified=True,
        completion=100,
        has_photo=True,
        created_at=datetime(2026, 1, 1),
    )
    # 20 + 25 + 15 + 10 + 5 = 75... includes age bonus; documented tenant
    # ceiling excludes only the landlord-docs 30
    assert compute_trust_score(tenant, now=NOW) == 75


def test_fully_verified_landlord_caps_at_100():
    landlord = build_user(
        roles=[RoleEnum.USER, RoleEnum.LANDLORD],
        is_verified=True,
        phone_verified=True,
        landlord_docs_approved=True,
        completion=100,
        has_photo=True,
        created_at=datetime(2026, 1, 1),
    )
    assert compute_trust_score(landlord, now=NOW) == 100


def test_trust_levels():
    assert trust_level(build_user()) == "unverified"
    assert trust_level(build_user(is_verified=True)) == "unverified"  # email alone
    assert trust_level(build_user(is_verified=True, phone_verified=True)) == "verified"
    assert (
        trust_level(
            build_user(roles=[RoleEnum.USER, RoleEnum.LANDLORD], landlord_docs_approved=True)
        )
        == "id_verified"
    )
