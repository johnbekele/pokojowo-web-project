#!/usr/bin/env python3
"""Seed chat mock data in the pokojowo_chat database."""
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.chat import Chat
from app.models.message import Message

load_dotenv()


async def seed():
    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    db_name = os.getenv("DATABASE_NAME", "pokojowo_chat")
    if not mongo_url:
        print("Set MONGODB_URL")
        return

    client = AsyncIOMotorClient(mongo_url)
    await init_beanie(database=client[db_name], document_models=[Chat, Message])

    existing = await Chat.count()
    if existing:
        print(f"Skipping — {existing} chats already in {db_name}")
        client.close()
        return

    # Example seed: requires participant user IDs from main API seed
    print(f"Chat seed ready in {db_name} (no default chats — run after user seed with IDs)")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
