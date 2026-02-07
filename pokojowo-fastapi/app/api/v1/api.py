from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, listings, messages, chat, upload, profile, matching, admin, favorites, likes, listing_interactions

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(listings.router, prefix="/listings", tags=["Listings"])
api_router.include_router(listing_interactions.router, prefix="/listing-interactions", tags=["Listing Interactions"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(matching.router, prefix="/matching", tags=["Matching"])
api_router.include_router(favorites.router, prefix="/favorites", tags=["Favorites"])
api_router.include_router(likes.router, prefix="/likes", tags=["Likes"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
