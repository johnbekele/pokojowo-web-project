"""
Likes service for managing the mutual matching system.
"""
import logging
import asyncio
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.models.like import Like, LikeStatusEnum
from app.models.mutual_match import MutualMatch, MatchStatusEnum
from app.models.user import User
from app.services.email_service import email_service
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)


async def _send_socket_notification(user_id: str, notification: dict):
    """Send real-time socket notification to user."""
    try:
        from app.core.socket import send_notification
        await send_notification(user_id, notification)
    except Exception as e:
        logger.error(f"Failed to send socket notification: {e}")


class LikesService:
    """Service for managing likes and mutual matches."""

    async def like_user(
        self,
        liker_id: str,
        liked_user_id: str,
        compatibility_score: Optional[float] = None
    ) -> dict:
        """
        Like a user. Returns mutual match if reciprocal.

        Args:
            liker_id: ID of the user liking
            liked_user_id: ID of the user being liked
            compatibility_score: Optional compatibility score

        Returns:
            dict: Result with like data and mutual match if applicable
        """
        # Can't like yourself
        if liker_id == liked_user_id:
            return {
                "status": "error",
                "message": "Cannot like yourself"
            }

        # Check if already liked
        existing_like = await Like.find_one({
            "likerId": liker_id,
            "likedUserId": liked_user_id
        })

        if existing_like:
            return {
                "status": "already_liked",
                "like": existing_like
            }

        # Check if the other user has already liked us (mutual match!)
        reciprocal_like = await Like.find_one({
            "likerId": liked_user_id,
            "likedUserId": liker_id,
            "status": LikeStatusEnum.PENDING
        })

        is_mutual = reciprocal_like is not None

        # Create new like
        like = Like(
            liker_id=liker_id,
            liked_user_id=liked_user_id,
            status=LikeStatusEnum.MUTUAL if is_mutual else LikeStatusEnum.PENDING,
            compatibility_score=compatibility_score
        )

        await like.insert()

        result = {
            "status": "liked",
            "like": like,
            "is_mutual": is_mutual
        }

        # If mutual, update reciprocal like and create mutual match
        if is_mutual:
            # Update reciprocal like status
            reciprocal_like.status = LikeStatusEnum.MUTUAL
            await reciprocal_like.save()

            # Create mutual match
            mutual_match = MutualMatch(
                user_1_id=min(liker_id, liked_user_id),  # Consistent ordering
                user_2_id=max(liker_id, liked_user_id),
                compatibility_score=compatibility_score or reciprocal_like.compatibility_score
            )

            await mutual_match.insert()

            # Get the liked user details for the modal
            liked_user = await User.get(liked_user_id)
            if liked_user:
                result["mutual_match"] = {
                    "matched_user_id": liked_user_id,
                    "user": self._format_user(liked_user),
                    "compatibility_score": compatibility_score or reciprocal_like.compatibility_score
                }
            else:
                result["mutual_match"] = mutual_match

            # Send notifications
            await self._notify_mutual_match(liker_id, liked_user_id)

            logger.info(f"Mutual match created between {liker_id} and {liked_user_id}")
        else:
            # Send notification about new like
            await self._notify_new_like(liker_id, liked_user_id)

        logger.info(f"User {liker_id} liked {liked_user_id}, mutual: {is_mutual}")

        return result

    async def unlike_user(
        self,
        liker_id: str,
        liked_user_id: str
    ) -> dict:
        """
        Unlike a user (remove like).

        Args:
            liker_id: ID of the user who liked
            liked_user_id: ID of the user to unlike

        Returns:
            dict: Result of unlike
        """
        like = await Like.find_one({
            "likerId": liker_id,
            "likedUserId": liked_user_id
        })

        if not like:
            return {
                "status": "not_found",
                "message": "Like not found"
            }

        was_mutual = like.status == LikeStatusEnum.MUTUAL

        # Delete the like
        await like.delete()

        # If was mutual, update reciprocal like and deactivate mutual match
        if was_mutual:
            # Update reciprocal like back to pending
            reciprocal_like = await Like.find_one({
                "likerId": liked_user_id,
                "likedUserId": liker_id
            })

            if reciprocal_like:
                reciprocal_like.status = LikeStatusEnum.PENDING
                await reciprocal_like.save()

            # Deactivate mutual match
            mutual_match = await self._find_mutual_match(liker_id, liked_user_id)
            if mutual_match:
                mutual_match.status = MatchStatusEnum.UNMATCHED
                mutual_match.unmatched_at = datetime.utcnow()
                mutual_match.unmatched_by = liker_id
                await mutual_match.save()

        logger.info(f"User {liker_id} unliked {liked_user_id}")

        return {
            "status": "unliked",
            "was_mutual": was_mutual
        }

    async def check_mutual_match(
        self,
        user_1_id: str,
        user_2_id: str
    ) -> bool:
        """
        Check if two users have a mutual match.

        Args:
            user_1_id: First user ID
            user_2_id: Second user ID

        Returns:
            bool: True if mutual match exists
        """
        match = await self._find_mutual_match(user_1_id, user_2_id)
        return match is not None and match.status == MatchStatusEnum.ACTIVE

    async def get_likes_sent(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """
        Get likes sent by a user.

        Args:
            user_id: ID of the user
            limit: Max results
            offset: Skip first N

        Returns:
            dict: List of likes sent with user details
        """
        likes = await Like.find({
            "likerId": user_id
        }).sort("-likedAt").skip(offset).limit(limit).to_list()

        # Get user details
        liked_user_ids = [l.liked_user_id for l in likes]
        users = await User.find({
            "_id": {"$in": [ObjectId(uid) for uid in liked_user_ids]}
        }).to_list()

        users_map = {str(u.id): u for u in users}

        results = []
        for like in likes:
            user = users_map.get(like.liked_user_id)
            if user:
                results.append({
                    "id": str(like.id),
                    "liked_user_id": like.liked_user_id,
                    "status": like.status.value,
                    "liked_at": like.liked_at.isoformat(),
                    "compatibility_score": like.compatibility_score,
                    "user": self._format_user(user)
                })

        total = await Like.find({"likerId": user_id}).count()

        return {
            "likes": results,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    async def get_likes_received(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """
        Get likes received by a user.

        Args:
            user_id: ID of the user
            limit: Max results
            offset: Skip first N

        Returns:
            dict: List of likes received with user details
        """
        likes = await Like.find({
            "likedUserId": user_id
        }).sort("-likedAt").skip(offset).limit(limit).to_list()

        # Get user details
        liker_ids = [l.liker_id for l in likes]
        users = await User.find({
            "_id": {"$in": [ObjectId(uid) for uid in liker_ids]}
        }).to_list()

        users_map = {str(u.id): u for u in users}

        results = []
        for like in likes:
            user = users_map.get(like.liker_id)
            if user:
                results.append({
                    "id": str(like.id),
                    "liker_id": like.liker_id,
                    "status": like.status.value,
                    "liked_at": like.liked_at.isoformat(),
                    "compatibility_score": like.compatibility_score,
                    "user": self._format_user(user)
                })

        total = await Like.find({"likedUserId": user_id}).count()

        return {
            "likes": results,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    async def get_mutual_matches(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """
        Get all mutual matches for a user.

        Args:
            user_id: ID of the user
            limit: Max results
            offset: Skip first N

        Returns:
            dict: List of mutual matches with user details
        """
        matches = await MutualMatch.find({
            "$or": [
                {"user1Id": user_id},
                {"user2Id": user_id}
            ],
            "status": MatchStatusEnum.ACTIVE
        }).sort("-matchedAt").skip(offset).limit(limit).to_list()

        # Get the other user IDs
        other_user_ids = []
        for m in matches:
            if m.user_1_id == user_id:
                other_user_ids.append(m.user_2_id)
            else:
                other_user_ids.append(m.user_1_id)

        users = await User.find({
            "_id": {"$in": [ObjectId(uid) for uid in other_user_ids]}
        }).to_list()

        users_map = {str(u.id): u for u in users}

        results = []
        for match in matches:
            other_user_id = match.user_2_id if match.user_1_id == user_id else match.user_1_id
            user = users_map.get(other_user_id)
            if user:
                results.append({
                    "id": str(match.id),
                    "matched_user_id": other_user_id,
                    "matched_at": match.matched_at.isoformat(),
                    "compatibility_score": match.compatibility_score,
                    "user": self._format_user(user)
                })

        total = await MutualMatch.find({
            "$or": [
                {"user1Id": user_id},
                {"user2Id": user_id}
            ],
            "status": MatchStatusEnum.ACTIVE
        }).count()

        return {
            "mutual_matches": results,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    async def get_like_status(
        self,
        user_id: str,
        other_user_id: str
    ) -> dict:
        """
        Get the like status between two users.

        Args:
            user_id: Current user ID
            other_user_id: Other user ID

        Returns:
            dict: Like status information
        """
        # Check if current user liked other user
        user_like = await Like.find_one({
            "likerId": user_id,
            "likedUserId": other_user_id
        })

        # Check if other user liked current user
        other_like = await Like.find_one({
            "likerId": other_user_id,
            "likedUserId": user_id
        })

        # Check for mutual match
        mutual_match = await self._find_mutual_match(user_id, other_user_id)
        is_mutual = mutual_match is not None and mutual_match.status == MatchStatusEnum.ACTIVE

        return {
            "i_liked": user_like is not None,
            "they_liked": other_like is not None,
            "is_mutual": is_mutual,
            "my_like_status": user_like.status.value if user_like else None,
            "their_like_status": other_like.status.value if other_like else None
        }

    async def unmatch(
        self,
        user_id: str,
        other_user_id: str
    ) -> dict:
        """
        Unmatch with a user (remove mutual match).

        Args:
            user_id: Current user ID
            other_user_id: Other user ID

        Returns:
            dict: Result of unmatch
        """
        mutual_match = await self._find_mutual_match(user_id, other_user_id)

        if not mutual_match or mutual_match.status != MatchStatusEnum.ACTIVE:
            return {
                "status": "not_found",
                "message": "Active mutual match not found"
            }

        # Deactivate the match
        mutual_match.status = MatchStatusEnum.UNMATCHED
        mutual_match.unmatched_at = datetime.utcnow()
        mutual_match.unmatched_by = user_id
        await mutual_match.save()

        # Update likes back to pending
        await Like.find({
            "likerId": user_id,
            "likedUserId": other_user_id
        }).update({"$set": {"status": LikeStatusEnum.PENDING}})

        await Like.find({
            "likerId": other_user_id,
            "likedUserId": user_id
        }).update({"$set": {"status": LikeStatusEnum.PENDING}})

        logger.info(f"User {user_id} unmatched with {other_user_id}")

        return {
            "status": "unmatched",
            "message": "Successfully unmatched"
        }

    async def get_stats(
        self,
        user_id: str
    ) -> dict:
        """
        Get like/match statistics for a user.

        Args:
            user_id: ID of the user

        Returns:
            dict: Statistics
        """
        likes_sent = await Like.find({"likerId": user_id}).count()
        likes_received = await Like.find({"likedUserId": user_id}).count()
        mutual_matches = await MutualMatch.find({
            "$or": [
                {"user1Id": user_id},
                {"user2Id": user_id}
            ],
            "status": MatchStatusEnum.ACTIVE
        }).count()

        # Pending likes (people who liked me but I haven't liked back)
        pending_likes = await Like.find({
            "likedUserId": user_id,
            "status": LikeStatusEnum.PENDING
        }).count()

        return {
            "likes_sent": likes_sent,
            "likes_received": likes_received,
            "mutual_matches": mutual_matches,
            "pending_likes": pending_likes
        }

    async def _find_mutual_match(
        self,
        user_1_id: str,
        user_2_id: str
    ) -> Optional[MutualMatch]:
        """Find mutual match between two users."""
        # Use consistent ordering
        id1, id2 = min(user_1_id, user_2_id), max(user_1_id, user_2_id)

        return await MutualMatch.find_one({
            "user1Id": id1,
            "user2Id": id2
        })

    def _format_user(self, user: User) -> dict:
        """Format user data for response."""
        return {
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

    async def _notify_mutual_match(
        self,
        user_1_id: str,
        user_2_id: str
    ):
        """Send mutual match notifications to both users (email + real-time + database)."""
        try:
            user_1 = await User.get(user_1_id)
            user_2 = await User.get(user_2_id)

            if user_1 and user_2:
                user_1_name = f"{user_1.firstname or ''} {user_1.lastname or ''}".strip() or user_1.username
                user_2_name = f"{user_2.firstname or ''} {user_2.lastname or ''}".strip() or user_2.username
                user_1_photo = user_1.photo.dict() if user_1.photo else None
                user_2_photo = user_2.photo.dict() if user_2.photo else None

                # Send real-time socket notifications to both users
                await _send_socket_notification(user_1_id, {
                    "type": "mutual_match",
                    "matchedUserId": user_2_id,
                    "matchedUserName": user_2_name,
                    "matchedUserPhoto": user_2_photo,
                    "message": f"You matched with {user_2.firstname or user_2.username}!"
                })

                await _send_socket_notification(user_2_id, {
                    "type": "mutual_match",
                    "matchedUserId": user_1_id,
                    "matchedUserName": user_1_name,
                    "matchedUserPhoto": user_1_photo,
                    "message": f"You matched with {user_1.firstname or user_1.username}!"
                })

                # Store notifications in database (for users who miss real-time)
                await notification_service.store_mutual_match_notification(
                    user_id=user_1_id,
                    matched_user_id=user_2_id,
                    matched_user_name=user_2_name,
                    matched_user_photo=user_2_photo
                )

                await notification_service.store_mutual_match_notification(
                    user_id=user_2_id,
                    matched_user_id=user_1_id,
                    matched_user_name=user_1_name,
                    matched_user_photo=user_1_photo
                )

                # Send email notifications (async, don't block)
                asyncio.create_task(email_service.send_mutual_match_notification(
                    to_email=user_1.email,
                    user_name=user_1.firstname or user_1.username,
                    match_name=user_2.firstname or user_2.username
                ))

                asyncio.create_task(email_service.send_mutual_match_notification(
                    to_email=user_2.email,
                    user_name=user_2.firstname or user_2.username,
                    match_name=user_1.firstname or user_1.username
                ))

                logger.info(f"Mutual match notifications sent to {user_1_id} and {user_2_id}")
        except Exception as e:
            logger.error(f"Failed to send mutual match notifications: {e}")

    async def _notify_new_like(
        self,
        liker_id: str,
        liked_user_id: str
    ):
        """Send notification about new like (email + real-time + database)."""
        try:
            liker = await User.get(liker_id)
            liked_user = await User.get(liked_user_id)

            if liker and liked_user:
                liker_name = f"{liker.firstname or ''} {liker.lastname or ''}".strip() or liker.username
                liker_photo = liker.photo.dict() if liker.photo else None

                # Send real-time socket notification
                await _send_socket_notification(liked_user_id, {
                    "type": "new_like",
                    "likerId": liker_id,
                    "likerName": liker_name,
                    "likerPhoto": liker_photo,
                    "message": f"{liker.firstname or liker.username} liked your profile!"
                })

                # Store notification in database (for users who miss real-time)
                await notification_service.store_like_notification(
                    user_id=liked_user_id,
                    liker_id=liker_id,
                    liker_name=liker_name,
                    liker_photo=liker_photo
                )

                # Send email notification (async, don't block)
                asyncio.create_task(email_service.send_new_like_notification(
                    to_email=liked_user.email,
                    user_name=liked_user.firstname or liked_user.username,
                    liker_name=liker.firstname or liker.username
                ))

                logger.info(f"New like notification sent to {liked_user_id} from {liker_id}")
        except Exception as e:
            logger.error(f"Failed to send new like notification: {e}")


# Singleton instance
likes_service = LikesService()
