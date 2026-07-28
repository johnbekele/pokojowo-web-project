"""
Apple Sign In Service

Verifies the identity token produced by native "Sign in with Apple" (Expo
`expo-apple-authentication`) and creates/links a local user account.

The native flow hands us a signed JWT (identity token). We validate its
signature against Apple's public JWKS, check the audience/issuer, then mint our
own access/refresh tokens - mirroring the Google OAuth service.
"""

from typing import Any, Dict, Optional, Tuple
import uuid
import logging
from datetime import datetime

import jwt  # PyJWT (provides PyJWKClient)
from fastapi import HTTPException

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User, PhotoModel, RoleEnum

logger = logging.getLogger(__name__)

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"


class AppleOAuthService:
    """Service for verifying Apple identity tokens and issuing app JWTs."""

    def __init__(self) -> None:
        # PyJWKClient caches the fetched signing keys internally.
        self._jwk_client: Optional[jwt.PyJWKClient] = None

    def _get_jwk_client(self) -> jwt.PyJWKClient:
        if self._jwk_client is None:
            self._jwk_client = jwt.PyJWKClient(APPLE_JWKS_URL)
        return self._jwk_client

    def verify_identity_token(self, identity_token: str) -> Dict[str, Any]:
        """
        Validate an Apple identity token and return its claims.

        Raises HTTPException(401) if the token is missing/invalid.
        """
        if not identity_token:
            raise HTTPException(status_code=401, detail="Missing Apple identity token")

        if not settings.APPLE_CLIENT_ID:
            raise HTTPException(
                status_code=500,
                detail="Apple Sign In is not configured. Please set APPLE_CLIENT_ID.",
            )

        try:
            signing_key = self._get_jwk_client().get_signing_key_from_jwt(identity_token)
            claims = jwt.decode(
                identity_token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.APPLE_CLIENT_ID,
                issuer=APPLE_ISSUER,
            )
            return claims
        except jwt.PyJWTError as e:
            logger.error(f"Apple identity token verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid Apple identity token")

    async def authenticate(
        self,
        identity_token: str,
        firstname: Optional[str] = None,
        lastname: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full native Apple auth: verify token, find/create user, mint JWTs.
        """
        claims = self.verify_identity_token(identity_token)

        apple_id = claims.get("sub")
        email = claims.get("email")
        # Apple only sends `email` on the first authorization; if the account was
        # created earlier we still resolve by apple_id below.
        if not apple_id:
            raise HTTPException(status_code=401, detail="Apple token missing subject")

        user, is_new_user = await self._find_or_create_user(
            apple_id=apple_id,
            email=email,
            firstname=firstname or "",
            lastname=lastname or "",
        )

        access_token = create_access_token(
            data={
                "user_id": str(user.id),
                "email": user.email,
                "username": user.username,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "role": [r.value for r in user.role] if user.role else [],
            }
        )
        refresh_token = create_refresh_token(data={"user_id": str(user.id)})

        user.refresh_token = refresh_token
        user.last_login = datetime.utcnow()
        await user.save()

        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "is_new_user": is_new_user,
            "requires_profile_completion": not user.is_profile_complete,
        }

    async def _find_or_create_user(
        self,
        apple_id: str,
        email: Optional[str],
        firstname: str,
        lastname: str,
    ) -> Tuple[User, bool]:
        """Find by apple_id, then by email (link), else create a new user."""
        # Existing Apple user.
        user = await User.find_one(User.apple_id == apple_id)
        if user:
            user.updated_at = datetime.utcnow()
            await user.save()
            return user, False

        # Link Apple to an existing email account.
        if email:
            user = await User.find_one(User.email == email)
            if user:
                user.apple_id = apple_id
                user.is_verified = True  # Apple has verified the email
                if not user.firstname and firstname:
                    user.firstname = firstname
                if not user.lastname and lastname:
                    user.lastname = lastname
                user.updated_at = datetime.utcnow()
                await user.save()
                return user, False

        # Create a new user. Apple may withhold email on repeat auths; when it
        # does we fall back to a stable placeholder derived from the Apple id.
        safe_email = email or f"{apple_id}@privaterelay.appleid.com"
        base_username = safe_email.split("@")[0][:20] or f"apple_{uuid.uuid4().hex[:6]}"
        username = base_username
        if await User.find_one(User.username == username):
            username = f"{base_username}_{uuid.uuid4().hex[:6]}"

        new_user = User(
            username=username,
            email=safe_email,
            apple_id=apple_id,
            firstname=firstname,
            lastname=lastname,
            photo=None,
            is_verified=bool(email),
            is_active=True,
            is_profile_complete=False,
            profile_completion_step=0,
            role=[RoleEnum.USER],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await new_user.insert()
        logger.info(f"Created new user from Apple: {new_user.username}")
        return new_user, True


# Singleton instance
apple_oauth_service = AppleOAuthService()
