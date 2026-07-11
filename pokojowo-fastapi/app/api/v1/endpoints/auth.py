from fastapi import APIRouter, HTTPException, status, Depends, Query, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from app.schemas.user_schema import (
    UserCreate, UserLogin, UserResponse, Token,
    PasswordReset, PasswordResetConfirm
)
from app.models.user import User
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    decode_token, create_verification_token,
    create_password_reset_token
)
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.services.email_service import email_service
from datetime import datetime
from typing import Optional
import secrets

router = APIRouter()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, background_tasks: BackgroundTasks):
    """Register a new user"""
    # Check if user already exists
    existing_user = await User.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    existing_username = await User.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Self-registration may only grant these roles — anything else
    # (Admin, Moderator, Agent) must be assigned server-side.
    ALLOWED_SIGNUP_ROLES = {"User", "Tenant", "Landlord"}
    requested_roles = user_data.role or ["User"]
    if not set(requested_roles).issubset(ALLOWED_SIGNUP_ROLES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Allowed roles: User, Tenant, Landlord"
        )

    # Hash password
    hashed_password = get_password_hash(user_data.password)

    # Create verification token
    from datetime import timedelta
    verification_token = create_verification_token(user_data.email)

    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password=hashed_password,
        firstname=user_data.firstname,
        lastname=user_data.lastname,
        role=requested_roles,
        verification_token=verification_token,
        verification_token_expires=datetime.utcnow() + timedelta(hours=24),
        is_verified=False
    )

    await user.insert()

    # Send verification email in background
    background_tasks.add_task(
        email_service.send_verification_email,
        user.email,
        verification_token
    )

    return {
        "message": "User registered successfully. Please check your email to verify your account.",
        "user_id": str(user.id)
    }


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login user"""
    # Find user by email
    user = await User.find_one({"email": user_data.email})

    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await user.save()

    # Create tokens
    access_token = create_access_token(data={"user_id": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"user_id": str(user.id)})

    # Save refresh token
    user.refresh_token = refresh_token
    await user.save()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "firstname": user.firstname,
            "lastname": user.lastname,
            "role": [role.value for role in user.role],
            "isVerified": user.is_verified,
            "isProfileComplete": user.is_profile_complete,
            "photo": user.photo.dict() if user.photo else None,
            "location": user.location,
        }
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user"""
    # Clear refresh token
    current_user.refresh_token = None
    await current_user.save()

    return {"message": "Logged out successfully"}


@router.get("/verify-email")
async def verify_email(token: str = Query(...)):
    """Verify user email"""
    payload = decode_token(token)

    if not payload or payload.get("type") != "verification":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    email = payload.get("email")
    user = await User.find_one({"email": email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_verified:
        return {"message": "Email already verified"}

    # Only the most recently issued token is valid — a superseded (but
    # still unexpired) JWT must not verify the account.
    if not user.verification_token or token != user.verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    await user.save()

    from app.services.trust_service import recompute_trust_score
    await recompute_trust_score(user)

    return {"message": "Email verified successfully"}


@router.post("/resend-verification-email")
async def resend_verification_email(email_data: dict, background_tasks: BackgroundTasks):
    """Resend verification email.

    Always answers 200 for well-formed requests so account existence
    can't be probed. Rate limited per email address.
    """
    from app.core.rate_limit import check_rate_limit
    from datetime import timedelta

    email = (email_data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )

    generic = {"message": "If the account exists, a verification email has been sent"}

    await check_rate_limit(f"resend_email:{email}", 3)

    user = await User.find_one({"email": email})
    if not user or user.is_verified:
        return generic

    if not email_service.is_configured and not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is temporarily unavailable. Please try again later."
        )

    # Create new verification token (supersedes any previous one)
    verification_token = create_verification_token(user.email)
    user.verification_token = verification_token
    user.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
    await user.save()

    background_tasks.add_task(
        email_service.send_verification_email,
        user.email,
        verification_token
    )

    return generic


@router.post("/forgot-password")
async def forgot_password(reset_data: PasswordReset, background_tasks: BackgroundTasks):
    """Request password reset"""
    user = await User.find_one({"email": reset_data.email})

    if not user:
        # Don't reveal if user exists
        return {"message": "If the email exists, a reset link has been sent"}

    # Create reset token
    reset_token = create_password_reset_token(user.email)
    user.reset_password_token = reset_token
    user.reset_password_expires = datetime.utcnow()
    await user.save()

    # Send password reset email in background
    background_tasks.add_task(
        email_service.send_password_reset_email,
        user.email,
        reset_token
    )

    return {"message": "If the email exists, a reset link has been sent"}


@router.get("/verify-reset-token")
async def verify_reset_token(token: str = Query(...)):
    """Verify password reset token"""
    payload = decode_token(token)

    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    return {"message": "Token is valid"}


@router.post("/reset-password")
async def reset_password(reset_data: PasswordResetConfirm):
    """Reset password with token"""
    payload = decode_token(reset_data.token)

    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    email = payload.get("email")
    user = await User.find_one({"email": email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update password
    user.password = get_password_hash(reset_data.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    await user.save()

    return {"message": "Password reset successfully"}


@router.put("/change-password")
async def change_password(
    password_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Change password for authenticated user"""
    old_password = password_data.get("old_password")
    new_password = password_data.get("new_password")

    if not verify_password(old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )

    current_user.password = get_password_hash(new_password)
    await current_user.save()

    return {"message": "Password changed successfully"}


@router.post("/refresh")
async def refresh_token(refresh_data: dict):
    """Refresh access token"""
    # Accept both spellings for backward compatibility with deployed clients
    refresh_token = refresh_data.get("refresh_token") or refresh_data.get("refreshToken")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token is required"
        )

    payload = decode_token(refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = payload.get("user_id")
    user = await User.get(user_id)

    if not user or user.refresh_token != refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Create new access token
    access_token = create_access_token(data={"user_id": str(user.id), "email": user.email})

    return {
        "access_token": access_token,
        # Duplicate key kept until all deployed clients read snake_case
        "accessToken": access_token,
        "token_type": "bearer"
    }


# Google OAuth endpoints
@router.get("/google")
async def google_auth(request: Request):
    """
    Initiate Google OAuth flow.
    Redirects user to Google's authorization page.
    """
    from app.services.google_oauth_service import google_oauth_service
    return await google_oauth_service.get_authorization_url(request)


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request):
    """
    Handle Google OAuth callback.
    Exchanges authorization code for tokens and creates/updates user.
    Redirects to frontend with tokens.
    """
    from app.services.google_oauth_service import google_oauth_service
    from urllib.parse import urlencode

    try:
        result = await google_oauth_service.handle_callback(request)

        user = result["user"]
        access_token = result["access_token"]
        refresh_token = result["refresh_token"]
        is_new_user = result.get("is_new_user", False)
        requires_profile_completion = result.get("requires_profile_completion", False)

        # Determine redirect URL
        frontend_url = settings.FRONTEND_URL or "http://localhost:5173"

        # Check if user has a real role (not just 'User')
        user_roles = [r.value for r in user.role] if user.role else []
        has_real_role = any(r in ['Tenant', 'Landlord', 'tenant', 'landlord'] for r in user_roles)

        # Always redirect to auth callback, let frontend handle routing
        params = {
            "token": access_token,
            "refresh_token": refresh_token,
            "is_new_user": "true" if is_new_user else "false",
            "requiresProfileCompletion": "true" if (requires_profile_completion or not user.is_profile_complete) else "false",
            "hasRole": "true" if has_real_role else "false",
            "firstname": user.firstname or "",
        }
        redirect_url = f"{frontend_url}/auth/callback?{urlencode(params)}"

        return RedirectResponse(url=redirect_url)

    except HTTPException:
        raise
    except Exception as e:
        # Redirect to frontend with error
        frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
        error_url = f"{frontend_url}/login?error={str(e)}"
        return RedirectResponse(url=error_url)
