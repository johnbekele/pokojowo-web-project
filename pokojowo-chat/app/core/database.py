from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.chat import Chat
from app.models.message import Message
import logging

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def connect_to_mongo():
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        await init_beanie(
            database=db.client[settings.DATABASE_NAME],
            document_models=[Chat, Message],
        )
        logger.info("Connected to MongoDB (%s)", settings.DATABASE_NAME)
    except Exception as e:
        logger.error("Failed to connect to MongoDB: %s", e)
        raise


async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection")
