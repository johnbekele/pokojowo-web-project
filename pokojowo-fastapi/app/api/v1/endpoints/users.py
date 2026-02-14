from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.schemas.user_schema import UserResponse, UserUpdate
from app.models.user import User, RoleEnum
from app.core.dependencies import get_current_user, require_role
from app.core.security import create_access_token, create_refresh_token
from typing import List, Optional
from datetime import datetime

router = APIRouter()


class RoleUpdate(BaseModel):
    """Schema for role update request"""
    role: str  # "tenant" or "landlord"


@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "_id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "firstname": current_user.firstname,
        "lastname": current_user.lastname,
        "role": [role.value for role in current_user.role],
        "isVerified": current_user.is_verified,
        "isProfileComplete": current_user.is_profile_complete,
        "photo": current_user.photo.dict() if current_user.photo else None,
        "phone": current_user.phone,
        "address": current_user.address,
        "location": current_user.location,
        "age": current_user.age,
        "gender": current_user.gender.value if current_user.gender else None,
        "bio": current_user.bio,
        "createdAt": current_user.created_at
    }


@router.put("/me", response_model=dict)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user information"""
    update_data = user_data.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return {"message": "User updated successfully"}


@router.put("/me/role", response_model=dict)
async def update_user_role(
    role_data: RoleUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's role (tenant, landlord, or both).
    This is called during onboarding when a new user selects their role.
    Returns a new token with the updated role.
    """
    role_value = role_data.role.lower()

    if role_value not in ["tenant", "landlord", "both"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'tenant', 'landlord', or 'both'"
        )

    # Update user's role - keep USER role and add the new role(s)
    current_roles = list(current_user.role) if current_user.role else []

    # Remove any existing tenant/landlord role
    current_roles = [r for r in current_roles if r not in [RoleEnum.TENANT, RoleEnum.LANDLORD]]

    # Add the new role(s)
    if role_value == "both":
        current_roles.append(RoleEnum.TENANT)
        current_roles.append(RoleEnum.LANDLORD)
    else:
        new_role = RoleEnum.TENANT if role_value == "tenant" else RoleEnum.LANDLORD
        current_roles.append(new_role)

    # Ensure USER role is present
    if RoleEnum.USER not in current_roles:
        current_roles.insert(0, RoleEnum.USER)

    current_user.role = current_roles
    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    # Create new tokens with updated role
    token_data = {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "firstname": current_user.firstname,
        "lastname": current_user.lastname,
        "role": [r.value for r in current_user.role]
    }

    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data={"user_id": str(current_user.id)})

    # Save refresh token
    current_user.refresh_token = refresh_token
    await current_user.save()

    role_message = "Tenant and Landlord" if role_value == "both" else role_value.capitalize()
    return {
        "message": f"Role updated to {role_message}",
        "data": {
            "token": access_token,
            "refresh_token": refresh_token,
            "role": [r.value for r in current_user.role],
            "user": {
                "_id": str(current_user.id),
                "username": current_user.username,
                "email": current_user.email,
                "firstname": current_user.firstname,
                "lastname": current_user.lastname,
                "role": [r.value for r in current_user.role]
            }
        }
    }


@router.delete("/me")
async def delete_current_user(current_user: User = Depends(get_current_user)):
    """Delete current user account"""
    await current_user.delete()
    return {"message": "User account deleted successfully"}


@router.get("/{user_id}", response_model=dict)
async def get_user_by_id(user_id: str):
    """Get user by ID"""
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
        "role": [role.value for role in user.role],
        "isVerified": user.is_verified
    }


@router.get("/", response_model=List[dict])
async def get_all_users(
    skip: int = 0,
    limit: int = 20,
    role: str = None
):
    """Get all users with optional filtering"""
    query = {}
    if role:
        query["role"] = role

    users = await User.find(query).skip(skip).limit(limit).to_list()

    return [
        {
            "_id": str(user.id),
            "username": user.username,
            "firstname": user.firstname,
            "lastname": user.lastname,
            "email": user.email,
            "role": [r.value for r in user.role],
            "isVerified": user.is_verified,
            "location": user.location
        }
        for user in users
    ]
