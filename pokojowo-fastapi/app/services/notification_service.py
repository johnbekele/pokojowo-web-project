"""
Notification service for sending match and message notifications.
Also handles storing notifications in database for users who miss real-time notifications.
"""
import logging
from typing import List, Optional
from datetime import datetime, timedelta

from app.models.user import User
from app.models.notification import Notification, NotificationTypeEnum
from app.services.email_service import email_service
from app.services.matching_service import matching_service

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing user notifications."""

    def __init__(self):
        self.min_score_for_notification = 70  # Only notify for good+ matches

    async def notify_new_matches_for_user(
        self,
        user: User,
        min_score: float = None
    ) -> dict:
        """
        Find and notify a user about their new high-quality matches.

        Args:
            user: The user to find matches for and notify
            min_score: Minimum score to notify about (default: 70)

        Returns:
            dict: Summary of notifications sent
        """
        if min_score is None:
            min_score = self.min_score_for_notification

        if not user.is_profile_complete:
            return {"status": "skipped", "reason": "Profile not complete"}

        # Find potential candidates
        candidates = await User.find({
            "isProfileComplete": True,
            "_id": {"$ne": user.id}
        }).to_list(length=500)

        if not candidates:
            return {"status": "skipped", "reason": "No candidates available"}

        # Run matching algorithm
        results = await matching_service.find_matches(
            user=user,
            candidates=candidates,
            limit=10,
            min_score=min_score
        )

        if not results["matches"]:
            return {"status": "skipped", "reason": "No high-quality matches found"}

        # Send notification about top matches
        top_matches = results["matches"][:5]  # Top 5 matches
        notifications_sent = 0

        for match in top_matches:
            success = await self._send_match_notification(user, match)
            if success:
                notifications_sent += 1

        return {
            "status": "success",
            "matches_found": len(results["matches"]),
            "notifications_sent": notifications_sent
        }

    async def notify_users_about_new_profile(
        self,
        new_user: User
    ) -> dict:
        """
        Notify existing users when a new compatible profile is created.

        Called when a user completes their profile for the first time.

        Args:
            new_user: The newly registered/completed user

        Returns:
            dict: Summary of notifications sent
        """
        if not new_user.is_profile_complete:
            return {"status": "skipped", "reason": "New user profile not complete"}

        # Find all users with completed profiles
        existing_users = await User.find({
            "isProfileComplete": True,
            "_id": {"$ne": new_user.id}
        }).to_list(length=500)

        if not existing_users:
            return {"status": "skipped", "reason": "No existing users to notify"}

        notifications_sent = 0

        for existing_user in existing_users:
            # Check if new_user is a good match for existing_user
            results = await matching_service.find_matches(
                user=existing_user,
                candidates=[new_user],
                limit=1,
                min_score=self.min_score_for_notification
            )

            if results["matches"]:
                match = results["matches"][0]
                success = await self._send_match_notification(existing_user, match)
                if success:
                    notifications_sent += 1

        return {
            "status": "success",
            "users_checked": len(existing_users),
            "notifications_sent": notifications_sent
        }

    async def _send_match_notification(
        self,
        recipient: User,
        match: dict
    ) -> bool:
        """
        Send an email notification about a new match.

        Args:
            recipient: User to notify
            match: Match data with score and user info

        Returns:
            bool: True if notification was sent successfully
        """
        try:
            match_name = match.get("firstname", "Someone")
            if match.get("lastname"):
                match_name = f"{match_name} {match['lastname'][0]}."

            score = match.get("compatibility_score", 0)

            success = await email_service.send_new_match_notification(
                to_email=recipient.email,
                user_name=recipient.firstname or recipient.username,
                match_name=match_name,
                match_score=int(score)
            )

            if success:
                logger.info(
                    f"Match notification sent to {recipient.email} "
                    f"for match with score {score}"
                )

            return success

        except Exception as e:
            logger.error(f"Failed to send match notification: {e}")
            return False

    async def send_message_notification(
        self,
        recipient: User,
        sender: User,
        message_preview: str
    ) -> bool:
        """
        Send an email notification about a new message.

        Args:
            recipient: User who received the message
            sender: User who sent the message
            message_preview: First part of the message

        Returns:
            bool: True if notification was sent successfully
        """
        try:
            sender_name = sender.firstname or sender.username
            if sender.lastname:
                sender_name = f"{sender_name} {sender.lastname[0]}."

            success = await email_service.send_new_message_notification(
                to_email=recipient.email,
                user_name=recipient.firstname or recipient.username,
                sender_name=sender_name,
                message_preview=message_preview[:100] if message_preview else ""
            )

            if success:
                logger.info(f"Message notification sent to {recipient.email}")

            return success

        except Exception as e:
            logger.error(f"Failed to send message notification: {e}")
            return False

    # ========== Database notification storage methods ==========

    async def store_notification(
        self,
        user_id: str,
        notification_type: NotificationTypeEnum,
        title: str,
        message: str,
        data: Optional[dict] = None
    ) -> Notification:
        """
        Store a notification in the database.

        Args:
            user_id: ID of the user to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional data (user info, IDs, etc.)

        Returns:
            The created notification
        """
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=data
        )
        await notification.insert()
        logger.info(f"Stored {notification_type.value} notification for user {user_id}")
        return notification

    async def store_like_notification(
        self,
        user_id: str,
        liker_id: str,
        liker_name: str,
        liker_photo: Optional[dict] = None
    ) -> Notification:
        """Store a notification for a new like."""
        return await self.store_notification(
            user_id=user_id,
            notification_type=NotificationTypeEnum.NEW_LIKE,
            title="Someone is interested!",
            message=f"{liker_name} wants to be your flatmate",
            data={
                "likerId": liker_id,
                "likerName": liker_name,
                "likerPhoto": liker_photo,
                "type": "new_like"
            }
        )

    async def store_mutual_match_notification(
        self,
        user_id: str,
        matched_user_id: str,
        matched_user_name: str,
        matched_user_photo: Optional[dict] = None
    ) -> Notification:
        """Store a notification for a mutual match."""
        return await self.store_notification(
            user_id=user_id,
            notification_type=NotificationTypeEnum.MUTUAL_MATCH,
            title="You're Connected!",
            message=f"You and {matched_user_name} are both interested!",
            data={
                "matchedUserId": matched_user_id,
                "matchedUserName": matched_user_name,
                "matchedUserPhoto": matched_user_photo,
                "type": "mutual_match"
            }
        )

    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False
    ) -> dict:
        """
        Get notifications for a user from database.

        Args:
            user_id: ID of the user
            limit: Max notifications to return
            offset: Skip first N notifications
            unread_only: Only return unread notifications

        Returns:
            Dict with notifications list and metadata
        """
        query = {"userId": user_id}
        if unread_only:
            query["isRead"] = False

        notifications = await Notification.find(query).sort(
            "-createdAt"
        ).skip(offset).limit(limit).to_list()

        total = await Notification.find(query).count()
        unread_count = await Notification.find({
            "userId": user_id,
            "isRead": False
        }).count()

        return {
            "notifications": [self._format_notification(n) for n in notifications],
            "total": total,
            "unread_count": unread_count,
            "limit": limit,
            "offset": offset
        }

    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read."""
        notification = await Notification.get(notification_id)
        if not notification or notification.user_id != user_id:
            return False

        notification.is_read = True
        notification.read_at = datetime.utcnow()
        await notification.save()
        return True

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        result = await Notification.find({
            "userId": user_id,
            "isRead": False
        }).update_many({
            "$set": {
                "isRead": True,
                "readAt": datetime.utcnow()
            }
        })
        return result.modified_count if result else 0

    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user."""
        return await Notification.find({
            "userId": user_id,
            "isRead": False
        }).count()

    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification."""
        notification = await Notification.get(notification_id)
        if not notification or notification.user_id != user_id:
            return False

        await notification.delete()
        return True

    def _format_notification(self, notification: Notification) -> dict:
        """Format notification for API response."""
        return {
            "id": str(notification.id),
            "type": notification.type.value,
            "title": notification.title,
            "message": notification.message,
            "data": notification.data,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "read_at": notification.read_at.isoformat() if notification.read_at else None
        }


# Singleton instance
notification_service = NotificationService()
