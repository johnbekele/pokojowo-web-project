from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.listing import Listing
from app.models.message import Message
from app.models.chat import Chat
from app.models.saved_match import SavedMatch
from app.models.like import Like
from app.models.mutual_match import MutualMatch
from app.models.listing_interaction import ListingInteraction
from app.models.notification import Notification
import logging

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def connect_to_mongo():
    """Connect to MongoDB"""
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)

        # Initialize beanie with document models
        await init_beanie(
            database=db.client[settings.DATABASE_NAME],
            document_models=[User, Listing, Message, Chat, SavedMatch, Like, MutualMatch, ListingInteraction, Notification]
        )

        logger.info("Connected to MongoDB successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection")


async def get_database():
    """Get database instance"""
    return db.client[settings.DATABASE_NAME]
