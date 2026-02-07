"""
Favorites service for managing saved/bookmarked matches.
"""
import logging
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.models.saved_match import SavedMatch
from app.models.user import User

logger = logging.getLogger(__name__)


class FavoritesService:
    """Service for managing saved matches (favorites)."""

    async def save_match(
        self,
        user_id: str,
        saved_user_id: str,
        notes: Optional[str] = None
    ) -> dict:
        """
        Save a user to favorites.

        Args:
            user_id: ID of the user saving
            saved_user_id: ID of the user being saved
            notes: Optional notes about the saved user

        Returns:
            dict: Result with saved match data
        """
        # Check if already saved
        existing = await SavedMatch.find_one({
            "userId": user_id,
            "savedUserId": saved_user_id
        })

        if existing:
            return {
                "status": "already_saved",
                "saved_match": existing
            }

        # Create new saved match
        saved_match = SavedMatch(
            user_id=user_id,
            saved_user_id=saved_user_id,
            notes=notes
        )

        await saved_match.insert()

        logger.info(f"User {user_id} saved match {saved_user_id}")

        return {
            "status": "saved",
            "saved_match": saved_match
        }

    async def remove_saved(
        self,
        user_id: str,
        saved_user_id: str
    ) -> dict:
        """
        Remove a user from favorites.

        Args:
            user_id: ID of the user who saved
            saved_user_id: ID of the user to remove

        Returns:
            dict: Result of removal
        """
        result = await SavedMatch.find_one({
            "userId": user_id,
            "savedUserId": saved_user_id
        })

        if not result:
            return {
                "status": "not_found",
                "message": "Saved match not found"
            }

        await result.delete()

        logger.info(f"User {user_id} removed saved match {saved_user_id}")

        return {
            "status": "removed",
            "message": "Saved match removed successfully"
        }

    async def get_saved_matches(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """
        Get all saved matches for a user with user details.

        Args:
            user_id: ID of the user
            limit: Max number of results
            offset: Skip first N results

        Returns:
            dict: List of saved matches with user details
        """
        saved_matches = await SavedMatch.find({
            "userId": user_id
        }).sort("-savedAt").skip(offset).limit(limit).to_list()

        # Get user details for saved matches
        saved_user_ids = [sm.saved_user_id for sm in saved_matches]
        users = await User.find({
            "_id": {"$in": [ObjectId(uid) for uid in saved_user_ids]}
        }).to_list()

        users_map = {str(u.id): u for u in users}

        results = []
        for sm in saved_matches:
            user = users_map.get(sm.saved_user_id)
            if user:
                results.append({
                    "id": str(sm.id),
                    "user_id": sm.saved_user_id,
                    "saved_at": sm.saved_at.isoformat(),
                    "notes": sm.notes,
                    "user": {
                        "id": str(user.id),
                        "firstname": user.firstname,
                        "lastname": user.lastname,
                        "username": user.username,
                        "photo": user.photo.dict() if user.photo else None,
                        "age": user.age,
                        "gender": user.gender.value if user.gender else None,
                        "location": user.location,
                        "bio": user.bio,
                        "job": user.job.dict() if user.job else None,
                    }
                })

        total = await SavedMatch.find({"userId": user_id}).count()

        return {
            "saved_matches": results,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    async def is_saved(
        self,
        user_id: str,
        saved_user_id: str
    ) -> bool:
        """
        Check if a user is saved.

        Args:
            user_id: ID of the user checking
            saved_user_id: ID of the user to check

        Returns:
            bool: True if saved
        """
        existing = await SavedMatch.find_one({
            "userId": user_id,
            "savedUserId": saved_user_id
        })

        return existing is not None

    async def update_notes(
        self,
        user_id: str,
        saved_user_id: str,
        notes: str
    ) -> dict:
        """
        Update notes for a saved match.

        Args:
            user_id: ID of the user
            saved_user_id: ID of the saved user
            notes: New notes

        Returns:
            dict: Result of update
        """
        saved_match = await SavedMatch.find_one({
            "userId": user_id,
            "savedUserId": saved_user_id
        })

        if not saved_match:
            return {
                "status": "not_found",
                "message": "Saved match not found"
            }

        saved_match.notes = notes
        await saved_match.save()

        return {
            "status": "updated",
            "saved_match": saved_match
        }

    async def get_saved_count(
        self,
        user_id: str
    ) -> int:
        """
        Get count of saved matches for a user.

        Args:
            user_id: ID of the user

        Returns:
            int: Number of saved matches
        """
        return await SavedMatch.find({"userId": user_id}).count()


# Singleton instance
favorites_service = FavoritesService()
