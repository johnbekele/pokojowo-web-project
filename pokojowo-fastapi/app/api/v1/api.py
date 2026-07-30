from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, listings, upload, profile, matching, admin, favorites, likes, listing_interactions, notifications, verification, saved_searches, internal

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(listings.router, prefix="/listings", tags=["Listings"])
api_router.include_router(listing_interactions.router, prefix="/listing-interactions", tags=["Listing Interactions"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(matching.router, prefix="/matching", tags=["Matching"])
api_router.include_router(favorites.router, prefix="/favorites", tags=["Favorites"])
api_router.include_router(likes.router, prefix="/likes", tags=["Likes"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(verification.router, prefix="/verification", tags=["Verification"])
api_router.include_router(saved_searches.router, prefix="/saved-searches", tags=["saved-searches"])
api_router.include_router(internal.router, prefix="/internal", tags=["Internal"])
