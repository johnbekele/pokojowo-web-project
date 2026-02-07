"""
Listing Match Service

Combines listing interactions with user-to-user compatibility matching
to find compatible roommates interested in the same listings.
"""

from typing import List, Dict, Optional
from app.models.user import User
from app.services.listing_interaction_service import listing_interaction_service
from app.services.matching_service import matching_service
import logging

logger = logging.getLogger(__name__)

# Minimum compatibility threshold for showing matches (70%)
DEFAULT_MIN_COMPATIBILITY = 70.0


class ListingMatchService:
    """
    Service for finding compatible roommates interested in the same listings.
    """

    async def get_compatible_interested_users(
        self,
        listing_id: str,
        current_user: User,
        min_compatibility: float = DEFAULT_MIN_COMPATIBILITY,
        limit: int = 5
    ) -> List[Dict]:
        """
        Get users interested in a listing who are compatible with the current user.

        1. Get all users who have interacted with this listing
        2. Filter out current user
        3. Calculate compatibility scores
        4. Return only users with >= min_compatibility
        5. Sort by compatibility score (highest first)

        Returns: [
            {
                "user_id": "...",
                "firstname": "Jan",
                "photo_url": "...",
                "compatibility_score": 85.5,
                "is_online": true
            }
        ]
        """
        current_user_id = str(current_user.id)

        # Get all interested users
        interested_user_ids = await listing_interaction_service.get_interested_users(
            listing_id=listing_id,
            exclude_user_id=current_user_id
        )

        if not interested_user_ids:
            return []

        # Fetch user documents
        interested_users = await User.find(
            {"_id": {"$in": [User.parse_id(uid) for uid in interested_user_ids]}},
            User.is_active == True
        ).to_list()

        if not interested_users:
            return []

        # Calculate compatibility for each interested user
        compatible_users = []

        for candidate in interested_users:
            # Calculate compatibility score using the matching service
            score, breakdown, explanations = matching_service._calculate_compatibility(
                current_user, candidate
            )

            # Only include if meets minimum threshold
            if score >= min_compatibility:
                compatible_users.append({
                    "user_id": str(candidate.id),
                    "firstname": candidate.firstname,
                    "lastname": candidate.lastname,
                    "photo_url": candidate.photo.url if candidate.photo else None,
                    "compatibility_score": round(score, 1),
                    "is_online": candidate.is_online,
                })

        # Sort by compatibility score (highest first)
        compatible_users.sort(key=lambda x: x["compatibility_score"], reverse=True)

        return compatible_users[:limit]

    async def get_batch_compatible_users(
        self,
        listing_ids: List[str],
        current_user: User,
        min_compatibility: float = DEFAULT_MIN_COMPATIBILITY,
        limit_per_listing: int = 3
    ) -> Dict[str, List[Dict]]:
        """
        Batch operation to get compatible interested users for multiple listings.
        Optimized for listing grid display.

        Returns: {
            "listing_id_1": [
                {"user_id": "...", "firstname": "Jan", "compatibility_score": 85.5}
            ],
            "listing_id_2": [...]
        }
        """
        if not listing_ids:
            return {}

        current_user_id = str(current_user.id)

        # Batch get all interested users for all listings
        listing_user_map = await listing_interaction_service.get_batch_interested_users(
            listing_ids=listing_ids,
            exclude_user_id=current_user_id
        )

        # Collect all unique user IDs we need to fetch
        all_user_ids = set()
        for user_ids in listing_user_map.values():
            all_user_ids.update(user_ids)

        if not all_user_ids:
            return {lid: [] for lid in listing_ids}

        # Fetch all users in one query
        users_list = await User.find(
            {"_id": {"$in": [User.parse_id(uid) for uid in all_user_ids]}},
            User.is_active == True
        ).to_list()

        # Build user lookup dict
        users_dict = {str(u.id): u for u in users_list}

        # Pre-calculate compatibility for all unique users
        compatibility_cache = {}
        for user_id, user in users_dict.items():
            score, _, _ = matching_service._calculate_compatibility(current_user, user)
            compatibility_cache[user_id] = {
                "user_id": user_id,
                "firstname": user.firstname,
                "photo_url": user.photo.url if user.photo else None,
                "compatibility_score": round(score, 1),
                "is_online": user.is_online,
            }

        # Build result for each listing
        result = {}
        for listing_id in listing_ids:
            interested_user_ids = listing_user_map.get(listing_id, [])

            # Get compatible users for this listing
            compatible = []
            for user_id in interested_user_ids:
                if user_id in compatibility_cache:
                    user_data = compatibility_cache[user_id]
                    if user_data["compatibility_score"] >= min_compatibility:
                        compatible.append(user_data)

            # Sort by score and limit
            compatible.sort(key=lambda x: x["compatibility_score"], reverse=True)
            result[listing_id] = compatible[:limit_per_listing]

        return result

    async def get_listings_with_compatible_count(
        self,
        listing_ids: List[str],
        current_user: User,
        min_compatibility: float = DEFAULT_MIN_COMPATIBILITY
    ) -> Dict[str, int]:
        """
        Get count of compatible interested users for each listing.
        Useful for quick badges without full user data.

        Returns: {"listing_id_1": 3, "listing_id_2": 0}
        """
        batch_result = await self.get_batch_compatible_users(
            listing_ids=listing_ids,
            current_user=current_user,
            min_compatibility=min_compatibility,
            limit_per_listing=100  # High limit to count all
        )

        return {lid: len(users) for lid, users in batch_result.items()}


# Singleton instance
listing_match_service = ListingMatchService()
