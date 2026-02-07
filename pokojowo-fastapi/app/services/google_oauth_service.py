"""
Google OAuth Service

Handles Google OAuth2 authentication flow including:
- Initiating OAuth redirect
- Handling callback and token exchange
- Creating/linking user accounts
"""

from typing import Optional, Dict, Any
import httpx
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User, PhotoModel, RoleEnum
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)


class GoogleOAuthService:
    """Service for handling Google OAuth2 authentication."""

    def __init__(self):
        self.oauth = self._setup_oauth()

    def _setup_oauth(self) -> OAuth:
        """Configure the OAuth client for Google."""
        oauth = OAuth()

        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            logger.warning("Google OAuth credentials not configured")
            return oauth

        oauth.register(
            name="google",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={
                "scope": "openid email profile",
            },
        )
        return oauth

    async def get_authorization_url(self, request: Request) -> RedirectResponse:
        """
        Initiate Google OAuth flow by redirecting to Google's authorization page.

        Args:
            request: FastAPI request object

        Returns:
            RedirectResponse to Google's OAuth authorization page
        """
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=500,
                detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            )

        # Store the referer URL for redirect after login
        referer = request.headers.get("referer", "")
        if referer:
            request.session["login_redirect"] = referer
        else:
            request.session["login_redirect"] = settings.FRONTEND_URL

        # Construct the redirect URI for the callback
        redirect_uri = settings.GOOGLE_REDIRECT_URI
        if not redirect_uri:
            # Build from request URL
            redirect_uri = str(request.url_for("google_callback"))

        logger.info(f"Initiating Google OAuth with redirect_uri: {redirect_uri}")

        return await self.oauth.google.authorize_redirect(
            request,
            redirect_uri,
            prompt="select_account"  # Always show account selector
        )

    async def handle_callback(self, request: Request) -> Dict[str, Any]:
        """
        Handle the OAuth callback from Google.

        Args:
            request: FastAPI request object containing the authorization code

        Returns:
            Dictionary containing user, tokens, and redirect URL
        """
        try:
            # Exchange authorization code for tokens
            token = await self.oauth.google.authorize_access_token(request)
            logger.info("Successfully obtained access token from Google")
        except Exception as e:
            logger.error(f"Failed to get access token: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail=f"Google authentication failed: {str(e)}"
            )

        # Get user info from the ID token or userinfo endpoint
        user_info = token.get("userinfo")

        if not user_info:
            # Fetch from userinfo endpoint if not in token
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {token['access_token']}"}
                    )
                    resp.raise_for_status()
                    user_info = resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch user info: {str(e)}")
                raise HTTPException(
                    status_code=401,
                    detail="Failed to fetch user information from Google"
                )

        # Extract user data
        google_id = user_info.get("sub")
        email = user_info.get("email")
        email_verified = user_info.get("email_verified", False)
        name = user_info.get("name", "")
        picture = user_info.get("picture")
        given_name = user_info.get("given_name", "")
        family_name = user_info.get("family_name", "")

        if not google_id or not email:
            raise HTTPException(
                status_code=401,
                detail="Missing required user information from Google"
            )

        logger.info(f"Google user info: email={email}, name={name}")

        # Find or create user
        user, is_new_user = await self._find_or_create_user(
            google_id=google_id,
            email=email,
            firstname=given_name or name.split()[0] if name else "",
            lastname=family_name or (name.split()[1] if len(name.split()) > 1 else ""),
            picture=picture,
            email_verified=email_verified
        )

        # Create JWT tokens with role included
        access_token = create_access_token(
            data={
                "user_id": str(user.id),
                "email": user.email,
                "username": user.username,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "role": [r.value for r in user.role] if user.role else []
            }
        )
        refresh_token = create_refresh_token(
            data={"user_id": str(user.id)}
        )

        # Save refresh token
        user.refresh_token = refresh_token
        user.last_login = datetime.utcnow()
        await user.save()

        # Get redirect URL
        redirect_url = self.get_redirect_url(request)

        # Check if profile is complete
        requires_profile_completion = not user.is_profile_complete

        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "redirect_url": redirect_url,
            "requires_profile_completion": requires_profile_completion,
            "is_new_user": is_new_user,
            "user_info": user_info
        }

    async def _find_or_create_user(
        self,
        google_id: str,
        email: str,
        firstname: str,
        lastname: str,
        picture: Optional[str] = None,
        email_verified: bool = True
    ) -> tuple[User, bool]:
        """
        Find existing user by Google ID or email, or create a new user.

        Args:
            google_id: Google's unique user ID
            email: User's email address
            firstname: User's first name
            lastname: User's last name
            picture: URL to user's profile picture
            email_verified: Whether the email is verified by Google

        Returns:
            Tuple of (User document, is_new_user bool)
        """
        # First, try to find by Google ID
        user = await User.find_one(User.google_id == google_id)

        if user:
            logger.info(f"Found existing user by Google ID: {user.email}")
            # Update profile picture if changed
            if picture and (not user.photo or user.photo.url != picture):
                user.photo = PhotoModel(url=picture)
            user.updated_at = datetime.utcnow()
            await user.save()
            return user, False  # Existing user

        # Try to find by email (user might have registered with email first)
        user = await User.find_one(User.email == email)

        if user:
            logger.info(f"Linking Google account to existing user: {user.email}")
            # Link Google account to existing user
            user.google_id = google_id
            user.is_verified = True  # Google verified the email
            if picture and not user.photo:
                user.photo = PhotoModel(url=picture)
            if not user.firstname and firstname:
                user.firstname = firstname
            if not user.lastname and lastname:
                user.lastname = lastname
            user.updated_at = datetime.utcnow()
            await user.save()
            return user, False  # Existing user (linking)

        # Create new user
        logger.info(f"Creating new user from Google: {email}")

        # Generate unique username from email
        base_username = email.split("@")[0]
        username = base_username

        # Ensure username is unique
        existing = await User.find_one(User.username == username)
        if existing:
            username = f"{base_username}_{uuid.uuid4().hex[:6]}"

        new_user = User(
            username=username,
            email=email,
            google_id=google_id,
            firstname=firstname,
            lastname=lastname,
            photo=PhotoModel(url=picture) if picture else None,
            is_verified=email_verified,
            is_active=True,
            is_profile_complete=False,
            profile_completion_step=0,
            role=[RoleEnum.USER],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        await new_user.insert()
        logger.info(f"Created new user: {new_user.username}")
        return new_user, True  # New user

    def get_redirect_url(self, request: Request) -> str:
        """
        Get the URL to redirect to after successful authentication.

        Args:
            request: FastAPI request object

        Returns:
            Redirect URL string
        """
        return request.session.pop(
            "login_redirect",
            settings.FRONTEND_URL or "http://localhost:5173"
        )


# Singleton instance
google_oauth_service = GoogleOAuthService()
