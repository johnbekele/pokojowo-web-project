#!/usr/bin/env python3
"""Copy chats and messages from the main pokojowo DB to pokojowo_chat."""
import argparse
import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient


async def migrate(dry_run: bool = False):
    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_url:
        print("ERROR: Set MONGODB_URL or MONGODB_URI", file=sys.stderr)
        sys.exit(1)

    source_db_name = os.getenv("SOURCE_DATABASE_NAME", "pokojowo")
    target_db_name = os.getenv("TARGET_DATABASE_NAME", "pokojowo_chat")

    client = AsyncIOMotorClient(mongo_url)
    source = client[source_db_name]
    target = client[target_db_name]

    for collection in ("chats", "messages"):
        source_count = await source[collection].count_documents({})
        target_count = await target[collection].count_documents({})
        print(f"{collection}: source={source_count}, target={target_count}")

        if dry_run:
            print(f"  [dry-run] would copy {source_count} documents")
            continue

        if target_count > 0:
            print(f"  WARNING: target {collection} is not empty — skipping (drop manually to re-run)")
            continue

        docs = await source[collection].find({}).to_list(length=None)
        if docs:
            await target[collection].insert_many(docs)
            print(f"  copied {len(docs)} documents")

    src_chats = await source["chats"].count_documents({})
    src_msgs = await source["messages"].count_documents({})
    tgt_chats = await target["chats"].count_documents({})
    tgt_msgs = await target["messages"].count_documents({})

    if not dry_run:
        if src_chats != tgt_chats or src_msgs != tgt_msgs:
            print("ERROR: count mismatch after migration", file=sys.stderr)
            sys.exit(1)
        print("Migration complete — counts match.")

    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate chat data to pokojowo_chat database")
    parser.add_argument("--dry-run", action="store_true", help="Report counts without writing")
    args = parser.parse_args()
    asyncio.run(migrate(dry_run=args.dry_run))
