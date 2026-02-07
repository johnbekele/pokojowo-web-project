"""
Services module - Business logic layer.
"""

from app.services.matching_service import matching_service, MatchingService
from app.services.seeding_service import seeding_service, SeedingService
from app.services.email_service import email_service, EmailService
from app.services.notification_service import notification_service, NotificationService
from app.services.favorites_service import favorites_service, FavoritesService
from app.services.likes_service import likes_service, LikesService

__all__ = [
    "matching_service",
    "MatchingService",
    "seeding_service",
    "SeedingService",
    "email_service",
    "EmailService",
    "notification_service",
    "NotificationService",
    "favorites_service",
    "FavoritesService",
    "likes_service",
    "LikesService",
]
