"""
Notification service for sending match and message notifications.
"""
import logging
from typing import List, Optional
from datetime import datetime, timedelta

from app.models.user import User
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


# Singleton instance
notification_service = NotificationService()
