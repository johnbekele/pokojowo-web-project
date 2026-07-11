"""Shared test fixtures.

Tests construct User Pydantic objects directly and exercise the pure
scoring functions on MatchingService — no MongoDB or Beanie init needed.
"""
from datetime import datetime
from typing import Optional

import pytest

from app.models.user import (
    BudgetModel,
    DailyRoutineModel,
    DealBreakersModel,
    FlatmateTraitsModel,
    LifestylePreferencesModel,
    PreferencesModel,
    TenantProfileModel,
    User,
    WorkHoursModel,
)
from app.services.matching_service import MatchingService


_counter = {"n": 0}


def make_user(
    *,
    username: Optional[str] = None,
    age: Optional[int] = None,
    date_of_birth: Optional[datetime] = None,
    gender: Optional[str] = None,
    location: Optional[str] = None,
    languages: Optional[list] = None,
    interests: Optional[list] = None,
    personality: Optional[list] = None,
    budget: Optional[tuple] = None,  # (min, max)
    preferred_location: Optional[str] = None,
    age_range: Optional[list] = None,
    preferred_gender: Optional[str] = None,
    lease_duration: Optional[int] = None,
    smokes: Optional[bool] = None,
    has_pets: Optional[bool] = None,
    ok_with_smoking: Optional[bool] = None,
    ok_with_pets: Optional[bool] = None,
    cleanliness: Optional[str] = None,
    social_level: Optional[str] = None,
    guests_frequency: Optional[str] = None,
    noise_tolerance: Optional[str] = None,
    cooking_frequency: Optional[str] = None,
    wake_up: Optional[str] = None,
    sleep_time: Optional[str] = None,
    work_from: Optional[str] = None,
    deal_breakers: Optional[DealBreakersModel] = None,
    has_partner: bool = False,
    has_children: bool = False,
    tenant_profile: Optional[TenantProfileModel] = None,
    created_at: Optional[datetime] = None,
) -> User:
    """Build a User with only the fields a test cares about.

    Pass tenant_profile explicitly to override the assembled one; pass
    nothing lifestyle-related to get a user with an empty tenant profile.
    """
    _counter["n"] += 1
    name = username or f"user{_counter['n']}"

    if tenant_profile is None:
        lifestyle = None
        if any(v is not None for v in (smokes, has_pets, ok_with_smoking, ok_with_pets)):
            lifestyle = LifestylePreferencesModel(
                smokes=smokes,
                has_pets=has_pets,
                ok_with_smoking=ok_with_smoking,
                ok_with_pets=ok_with_pets,
            )

        preferences = None
        if any(
            v is not None
            for v in (budget, preferred_location, age_range, preferred_gender, lease_duration, lifestyle)
        ):
            preferences = PreferencesModel(
                location=preferred_location,
                gender=preferred_gender,
                age_range=age_range,
                lifestyle_preferences=lifestyle,
                budget=BudgetModel(min=budget[0], max=budget[1]) if budget else None,
                lease_duration_months=lease_duration if lease_duration is not None else 12,
            )

        traits = None
        if any(
            v is not None
            for v in (cleanliness, social_level, guests_frequency, noise_tolerance, cooking_frequency)
        ):
            traits = FlatmateTraitsModel(
                cleanliness=cleanliness,
                social_level=social_level,
                guests_frequency=guests_frequency,
                noise_tolerance=noise_tolerance,
                cooking_frequency=cooking_frequency,
            )

        routine = None
        if any(v is not None for v in (wake_up, sleep_time, work_from)):
            routine = DailyRoutineModel(
                wake_up=wake_up,
                sleep_time=sleep_time,
                work_hours=WorkHoursModel(from_time=work_from) if work_from else None,
            )

        tenant_profile = TenantProfileModel(
            interests=interests or [],
            personality=personality or [],
            daily_routine=routine,
            preferences=preferences,
            flatmate_traits=traits,
            deal_breakers=deal_breakers,
            has_partner=has_partner,
            has_children=has_children,
        )

    # model_construct skips Beanie's Document.__init__ (which requires an
    # initialized Mongo collection) — fine for tests that only read fields.
    return User.model_construct(
        username=name,
        email=f"{name}@example.com",
        age=age,
        date_of_birth=date_of_birth,
        gender=gender,
        location=location,
        languages=languages or [],
        tenant_profile=tenant_profile,
        created_at=created_at or datetime(2020, 1, 1),
    )


@pytest.fixture
def service() -> MatchingService:
    return MatchingService()
