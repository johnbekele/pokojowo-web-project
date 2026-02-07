"""
Listing Interaction Service

Tracks user interactions with listings (views, likes, inquiries).
Provides data for roommate-listing matching feature.
"""

from typing import List, Optional, Dict
from datetime import datetime, timedelta
from app.models.listing_interaction import (
    ListingInteraction,
    InteractionTypeEnum,
    INTEREST_WEIGHTS,
)
import logging

logger = logging.getLogger(__name__)


class ListingInteractionService:
    """
    Service for tracking and querying user interactions with listings.
    """

    async def track_view(
        self,
        user_id: str,
        listing_id: str,
        duration_seconds: Optional[int] = None
    ) -> ListingInteraction:
        """
        Track a view interaction. Updates existing view if within 30 minutes,
        otherwise creates a new one.
        """
        # Check for recent view (within 30 minutes)
        recent_view = await ListingInteraction.find_one(
            ListingInteraction.user_id == user_id,
            ListingInteraction.listing_id == listing_id,
            ListingInteraction.interaction_type == InteractionTypeEnum.VIEW,
            ListingInteraction.created_at >= datetime.utcnow() - timedelta(minutes=30)
        )

        if recent_view:
            # Update duration if provided
            if duration_seconds:
                recent_view.view_duration_seconds = (
                    (recent_view.view_duration_seconds or 0) + duration_seconds
                )
                await recent_view.save()
            return recent_view

        # Create new view interaction
        interaction = ListingInteraction(
            user_id=user_id,
            listing_id=listing_id,
            interaction_type=InteractionTypeEnum.VIEW,
            view_duration_seconds=duration_seconds,
        )
        await interaction.insert()
        logger.info(f"Tracked view: user={user_id}, listing={listing_id}")
        return interaction

    async def track_like(
        self,
        user_id: str,
        listing_id: str
    ) -> Optional[ListingInteraction]:
        """
        Track a like interaction. Returns None if already liked.
        """
        # Check if already liked
        existing = await ListingInteraction.find_one(
            ListingInteraction.user_id == user_id,
            ListingInteraction.listing_id == listing_id,
            ListingInteraction.interaction_type == InteractionTypeEnum.LIKE,
        )

        if existing:
            return None  # Already liked

        interaction = ListingInteraction(
            user_id=user_id,
            listing_id=listing_id,
            interaction_type=InteractionTypeEnum.LIKE,
        )
        await interaction.insert()
        logger.info(f"Tracked like: user={user_id}, listing={listing_id}")
        return interaction

    async def remove_like(
        self,
        user_id: str,
        listing_id: str
    ) -> bool:
        """
        Remove a like interaction. Returns True if removed, False if not found.
        """
        result = await ListingInteraction.find_one(
            ListingInteraction.user_id == user_id,
            ListingInteraction.listing_id == listing_id,
            ListingInteraction.interaction_type == InteractionTypeEnum.LIKE,
        )

        if result:
            await result.delete()
            logger.info(f"Removed like: user={user_id}, listing={listing_id}")
            return True
        return False

    async def track_inquiry(
        self,
        user_id: str,
        listing_id: str,
        message_id: Optional[str] = None
    ) -> ListingInteraction:
        """
        Track an inquiry interaction (when user contacts landlord).
        Allows multiple inquiries.
        """
        interaction = ListingInteraction(
            user_id=user_id,
            listing_id=listing_id,
            interaction_type=InteractionTypeEnum.INQUIRY,
            message_id=message_id,
        )
        await interaction.insert()
        logger.info(f"Tracked inquiry: user={user_id}, listing={listing_id}")
        return interaction

    async def get_user_interactions(
        self,
        user_id: str,
        listing_id: str
    ) -> Dict[str, bool]:
        """
        Get all interaction types a user has with a listing.
        Returns: {"hasViewed": bool, "hasLiked": bool, "hasInquired": bool}
        """
        interactions = await ListingInteraction.find(
            ListingInteraction.user_id == user_id,
            ListingInteraction.listing_id == listing_id,
        ).to_list()

        types = {i.interaction_type for i in interactions}

        return {
            "hasViewed": InteractionTypeEnum.VIEW in types,
            "hasLiked": InteractionTypeEnum.LIKE in types,
            "hasInquired": InteractionTypeEnum.INQUIRY in types,
        }

    async def get_interested_users(
        self,
        listing_id: str,
        exclude_user_id: Optional[str] = None
    ) -> List[str]:
        """
        Get all unique user IDs who have interacted with a listing.
        """
        pipeline = [
            {"$match": {"listingId": listing_id}},
            {"$group": {"_id": "$userId"}},
        ]

        results = await ListingInteraction.aggregate(pipeline).to_list()
        user_ids = [r["_id"] for r in results]

        if exclude_user_id:
            user_ids = [uid for uid in user_ids if uid != exclude_user_id]

        return user_ids

    async def get_user_liked_listings(
        self,
        user_id: str
    ) -> List[str]:
        """
        Get all listing IDs that a user has liked.
        """
        interactions = await ListingInteraction.find(
            ListingInteraction.user_id == user_id,
            ListingInteraction.interaction_type == InteractionTypeEnum.LIKE,
        ).to_list()

        return [i.listing_id for i in interactions]

    async def has_user_interacted(
        self,
        user_id: str,
        listing_id: str
    ) -> bool:
        """
        Check if a user has any interaction with a listing.
        """
        interaction = await ListingInteraction.find_one(
            ListingInteraction.user_id == user_id,
            ListingInteraction.listing_id == listing_id,
        )
        return interaction is not None

    async def calculate_interest_score(
        self,
        user_id: str,
        listing_id: str
    ) -> int:
        """
        Calculate interest score based on interaction types.
        View = 1 point, Like = 3 points, Inquiry = 5 points
        Max possible: 9 (if user viewed, liked, AND inquired)
        """
        interactions = await ListingInteraction.find(
            ListingInteraction.user_id == user_id,
            ListingInteraction.listing_id == listing_id,
        ).to_list()

        # Get unique interaction types
        types = {i.interaction_type for i in interactions}

        # Sum weights for each type
        score = sum(INTEREST_WEIGHTS.get(t, 0) for t in types)
        return score

    async def get_batch_interested_users(
        self,
        listing_ids: List[str],
        exclude_user_id: Optional[str] = None
    ) -> Dict[str, List[str]]:
        """
        Batch get interested users for multiple listings.
        Returns: {listing_id: [user_ids]}
        """
        if not listing_ids:
            return {}

        pipeline = [
            {"$match": {"listingId": {"$in": listing_ids}}},
            {"$group": {
                "_id": {"listingId": "$listingId", "userId": "$userId"}
            }},
            {"$group": {
                "_id": "$_id.listingId",
                "userIds": {"$push": "$_id.userId"}
            }},
        ]

        results = await ListingInteraction.aggregate(pipeline).to_list()

        # Build result dictionary
        result_dict = {}
        for r in results:
            listing_id = r["_id"]
            user_ids = r["userIds"]
            if exclude_user_id:
                user_ids = [uid for uid in user_ids if uid != exclude_user_id]
            result_dict[listing_id] = user_ids

        # Fill in empty lists for listings with no interactions
        for listing_id in listing_ids:
            if listing_id not in result_dict:
                result_dict[listing_id] = []

        return result_dict

    async def get_listing_stats(
        self,
        listing_id: str
    ) -> Dict[str, int]:
        """
        Get interaction statistics for a listing.
        """
        pipeline = [
            {"$match": {"listingId": listing_id}},
            {"$group": {
                "_id": "$interactionType",
                "count": {"$sum": 1},
                "uniqueUsers": {"$addToSet": "$userId"}
            }},
        ]

        results = await ListingInteraction.aggregate(pipeline).to_list()

        stats = {
            "totalViews": 0,
            "uniqueViewers": 0,
            "totalLikes": 0,
            "totalInquiries": 0,
        }

        for r in results:
            interaction_type = r["_id"]
            count = r["count"]
            unique_users = len(r["uniqueUsers"])

            if interaction_type == InteractionTypeEnum.VIEW.value:
                stats["totalViews"] = count
                stats["uniqueViewers"] = unique_users
            elif interaction_type == InteractionTypeEnum.LIKE.value:
                stats["totalLikes"] = unique_users  # Likes are unique per user
            elif interaction_type == InteractionTypeEnum.INQUIRY.value:
                stats["totalInquiries"] = count

        return stats


# Singleton instance
listing_interaction_service = ListingInteractionService()
