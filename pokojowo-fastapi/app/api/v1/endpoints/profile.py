from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.notification_service import notification_service
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=dict)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user's complete profile"""
    return {
        "_id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "firstname": current_user.firstname,
        "lastname": current_user.lastname,
        "role": [role.value for role in current_user.role],
        "isVerified": current_user.is_verified,
        "isProfileComplete": current_user.is_profile_complete,
        "profileCompletionStep": current_user.profile_completion_step,
        "photo": current_user.photo.dict() if current_user.photo else None,
        "phone": current_user.phone,
        "address": current_user.address,
        "location": current_user.location,
        "preferredContact": current_user.preferred_contact,
        "languages": current_user.languages,
        "preferredLanguage": current_user.preferred_language,
        "age": current_user.age,
        "gender": current_user.gender.value if current_user.gender else None,
        "bio": current_user.bio,
        "job": current_user.job.dict() if current_user.job else None,
        "tenantProfile": current_user.tenant_profile.dict(by_alias=True) if current_user.tenant_profile else None,
        "landlordProfile": current_user.landlord_profile.dict(by_alias=True) if current_user.landlord_profile else None,
        "chatSettings": current_user.chat_settings.dict(by_alias=True) if current_user.chat_settings else None,
        "notificationPreferences": current_user.notification_preferences.dict() if current_user.notification_preferences else None,
        "lastLogin": current_user.last_login,
        "createdAt": current_user.created_at,
        "updatedAt": current_user.updated_at
    }


@router.put("/", response_model=dict)
async def update_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    # Update allowed fields
    allowed_fields = [
        "firstname", "lastname", "phone", "address", "location",
        "preferred_contact", "languages", "preferred_language",
        "age", "gender", "bio", "job", "tenant_profile", "landlord_profile",
        "chat_settings", "notification_preferences"
    ]

    for field, value in profile_data.items():
        # Convert camelCase to snake_case
        snake_field = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')

        if snake_field in allowed_fields and value is not None:
            setattr(current_user, snake_field, value)

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return {"message": "Profile updated successfully"}


@router.put("/photo", response_model=dict)
async def update_profile_photo(
    photo_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user profile photo"""
    photo_url = photo_data.get("url")

    if not photo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo URL is required"
        )

    from app.models.user import PhotoModel
    current_user.photo = PhotoModel(url=photo_url)
    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return {
        "message": "Profile photo updated successfully",
        "photo": current_user.photo.dict()
    }


@router.get("/completion-status", response_model=dict)
async def get_completion_status(current_user: User = Depends(get_current_user)):
    """Get profile completion status for onboarding progress"""
    # Calculate what sections are incomplete
    incomplete_groups = []

    if not current_user.firstname or not current_user.lastname:
        incomplete_groups.append("Basic Information")
    if not current_user.phone and not current_user.location:
        incomplete_groups.append("Contact Information")
    if not current_user.tenant_profile or not current_user.tenant_profile.preferences:
        incomplete_groups.append("Preferences")
    if not current_user.tenant_profile or not current_user.tenant_profile.flatmate_traits:
        incomplete_groups.append("Flatmate Traits")
    if not current_user.languages:
        incomplete_groups.append("Languages")

    return {
        "profileCompletionStep": current_user.profile_completion_step or 0,
        "isProfileComplete": current_user.is_profile_complete,
        "incompleteGroups": incomplete_groups,
        "completedSteps": {
            "basicInfo": bool(current_user.firstname and current_user.lastname),
            "contact": bool(current_user.phone or current_user.location),
            "preferences": bool(current_user.tenant_profile and current_user.tenant_profile.preferences),
            "flatmateTraits": bool(current_user.tenant_profile and current_user.tenant_profile.flatmate_traits),
            "languages": bool(current_user.languages)
        }
    }


@router.put("/completion", response_model=dict)
async def update_profile_completion(
    completion_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update profile completion step"""
    step = completion_data.get("step")
    data = completion_data.get("data", {})

    if step is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step is required"
        )

    # Update profile data based on step
    for field, value in data.items():
        snake_field = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')
        if hasattr(current_user, snake_field):
            setattr(current_user, snake_field, value)

    current_user.profile_completion_step = step

    # Check if profile is complete (assuming step 5 is final)
    if step >= 5:
        current_user.is_profile_complete = True

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return {
        "message": "Profile completion updated",
        "step": current_user.profile_completion_step,
        "isComplete": current_user.is_profile_complete
    }


@router.put("/complete-tenant", response_model=dict)
async def complete_tenant_profile(
    profile_data: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Complete tenant profile during onboarding"""
    was_previously_complete = current_user.is_profile_complete
    from app.models.user import (
        TenantProfileModel, PreferencesModel, FlatmateTraitsModel,
        DealBreakersModel, JobModel, PhotoModel, GenderEnum, BudgetModel
    )

    # Update basic user fields
    if "firstname" in profile_data:
        current_user.firstname = profile_data["firstname"]
    if "lastname" in profile_data:
        current_user.lastname = profile_data["lastname"]
    if "phone" in profile_data:
        current_user.phone = profile_data["phone"]
    if "location" in profile_data:
        current_user.location = profile_data["location"]
    if "bio" in profile_data:
        current_user.bio = profile_data["bio"]
    if "age" in profile_data:
        current_user.age = profile_data["age"]
    if "gender" in profile_data and profile_data["gender"]:
        try:
            current_user.gender = GenderEnum(profile_data["gender"])
        except ValueError:
            pass
    if "languages" in profile_data:
        current_user.languages = profile_data["languages"]
    if "preferredLanguage" in profile_data:
        current_user.preferred_language = profile_data["preferredLanguage"]

    # Update photo
    if "photo" in profile_data and profile_data["photo"]:
        photo_data = profile_data["photo"]
        if isinstance(photo_data, str):
            current_user.photo = PhotoModel(url=photo_data)
        elif isinstance(photo_data, dict) and "url" in photo_data:
            current_user.photo = PhotoModel(url=photo_data["url"])

    # Update job
    if "job" in profile_data and profile_data["job"]:
        job_data = profile_data["job"]
        current_user.job = JobModel(
            title=job_data.get("title"),
            company=job_data.get("company"),
            industry=job_data.get("industry"),
            employment_type=job_data.get("employmentType"),
            work_schedule=job_data.get("workSchedule")
        )

    # Update tenant profile
    tenant_data = profile_data.get("tenantProfile", {})
    if tenant_data or not current_user.tenant_profile:
        # Get preferences
        prefs_data = tenant_data.get("preferences", {})
        budget_data = prefs_data.get("budget", {})

        preferences = PreferencesModel(
            location=prefs_data.get("location"),
            budget=BudgetModel(
                min=budget_data.get("min") or prefs_data.get("budgetMin"),
                max=budget_data.get("max") or prefs_data.get("budgetMax")
            ) if budget_data or prefs_data.get("budgetMin") else None,
            lease_duration_months=prefs_data.get("leaseDuration", 12)
        )

        # Get flatmate traits
        traits_data = tenant_data.get("flatmateTraits", {})
        flatmate_traits = FlatmateTraitsModel(
            cleanliness=traits_data.get("cleanliness"),
            social_level=traits_data.get("socialLevel"),
            guests_frequency=traits_data.get("guestsFrequency")
        )

        # Get deal breakers
        deal_data = tenant_data.get("dealBreakers", {})
        deal_breakers = DealBreakersModel(
            no_smokers=deal_data.get("noSmokers", False),
            no_pets=deal_data.get("noPets", False),
            no_parties=deal_data.get("noParties", False),
            same_gender_only=deal_data.get("sameGenderOnly", False),
            quiet_hours_required=deal_data.get("quietHoursRequired", False)
        )

        current_user.tenant_profile = TenantProfileModel(
            preferences=preferences,
            flatmate_traits=flatmate_traits,
            deal_breakers=deal_breakers,
            interests=tenant_data.get("interests", [])
        )

    # Calculate completion percentage based on filled fields
    completion_score = 0

    # Basic info (20%)
    if current_user.firstname and current_user.lastname:
        completion_score += 20

    # Contact info (20%)
    if current_user.phone or current_user.location:
        completion_score += 10
    if current_user.phone and current_user.location:
        completion_score += 10

    # Age and gender (10%)
    if current_user.age:
        completion_score += 5
    if current_user.gender:
        completion_score += 5

    # Bio (10%)
    if current_user.bio:
        completion_score += 10

    # Languages (10%)
    if current_user.languages and len(current_user.languages) > 0:
        completion_score += 10

    # Tenant profile preferences (15%)
    if current_user.tenant_profile and current_user.tenant_profile.preferences:
        completion_score += 15

    # Flatmate traits (10%)
    if current_user.tenant_profile and current_user.tenant_profile.flatmate_traits:
        completion_score += 10

    # Deal breakers (5%)
    if current_user.tenant_profile and current_user.tenant_profile.deal_breakers:
        completion_score += 5

    # Update completion step
    current_user.profile_completion_step = min(completion_score, 100)

    # Mark as complete if 80%+
    current_user.is_profile_complete = current_user.profile_completion_step >= 80

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    # If profile just became complete, notify other users about new potential match
    if current_user.is_profile_complete and not was_previously_complete:
        background_tasks.add_task(
            notification_service.notify_users_about_new_profile,
            current_user
        )

    return {
        "message": "Tenant profile updated successfully",
        "isProfileComplete": current_user.is_profile_complete,
        "profileCompletionStep": current_user.profile_completion_step
    }


@router.put("/landlord", response_model=dict)
async def update_landlord_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update landlord profile during onboarding"""
    # Update basic fields
    if "firstname" in profile_data:
        current_user.firstname = profile_data["firstname"]
    if "lastname" in profile_data:
        current_user.lastname = profile_data["lastname"]
    if "phone" in profile_data:
        current_user.phone = profile_data["phone"]
    if "location" in profile_data:
        current_user.location = profile_data["location"]
    if "bio" in profile_data:
        current_user.bio = profile_data["bio"]

    # Mark profile as partially complete
    if current_user.profile_completion_step < 50:
        current_user.profile_completion_step = 50

    # Mark as complete if basic info filled
    if current_user.firstname and current_user.lastname:
        current_user.is_profile_complete = True
        current_user.profile_completion_step = 100

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return {
        "message": "Landlord profile updated successfully",
        "isProfileComplete": current_user.is_profile_complete,
        "profileCompletionStep": current_user.profile_completion_step
    }


@router.get("/{user_id}", response_model=dict)
async def get_user_profile(user_id: str):
    """Get public profile of any user"""
    user = await User.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Return public information only
    return {
        "_id": str(user.id),
        "username": user.username,
        "firstname": user.firstname,
        "lastname": user.lastname,
        "photo": user.photo.dict() if user.photo else None,
        "bio": user.bio,
        "location": user.location,
        "age": user.age,
        "gender": user.gender.value if user.gender else None,
        "role": [role.value for role in user.role],
        "isVerified": user.is_verified,
        "languages": user.languages,
        # Include relevant profile based on role
        "tenantProfile": user.tenant_profile.dict(by_alias=True) if user.tenant_profile and user.is_tenant else None,
        "landlordProfile": {
            "yearsOfExperience": user.landlord_profile.years_of_experience,
            "propertyTypes": user.landlord_profile.property_types,
            "servicesOffered": user.landlord_profile.services_offered,
            "responseTime": user.landlord_profile.response_time,
            "statistics": user.landlord_profile.statistics.dict(by_alias=True) if user.landlord_profile.statistics else None
        } if user.landlord_profile and user.is_landlord else None
    }
