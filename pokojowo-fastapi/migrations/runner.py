"""Run versioned MongoDB migrations exactly once per database.

The runner uses a short-lived lease document so two deploys cannot apply the
same migration concurrently.  Migrations are recorded only after successful
completion; each migration must therefore be idempotent in case a process is
interrupted after changing data but before recording its version.
"""

from __future__ import annotations

import argparse
import asyncio
import importlib
import logging
import os
import sys
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

dedupe_likes_and_matches = importlib.import_module(
    "migrations.versions.001_dedupe_likes_and_matches"
)

logger = logging.getLogger("migrations")

MIGRATIONS_COLLECTION = "_schema_migrations"
LOCK_COLLECTION = "_schema_migration_lock"
LOCK_ID = "migration-runner"
LOCK_LEASE = timedelta(minutes=15)
MigrationFn = Callable[[Any], Awaitable[dict[str, int] | None]]

MIGRATIONS: tuple[tuple[str, str, MigrationFn], ...] = (
    (
        "001",
        "deduplicate likes and mutual matches and enforce uniqueness",
        dedupe_likes_and_matches.apply,
    ),
)


def _now() -> datetime:
    return datetime.now(UTC)


async def _acquire_lock(database: Any, owner: str) -> bool:
    now = _now()
    locks = database[LOCK_COLLECTION]
    try:
        document = await locks.find_one_and_update(
            {
                "_id": LOCK_ID,
                "$or": [{"expiresAt": {"$lte": now}}, {"owner": owner}],
            },
            {"$set": {"owner": owner, "expiresAt": now + LOCK_LEASE}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        return False
    return bool(document and document.get("owner") == owner)


async def _release_lock(database: Any, owner: str) -> None:
    await database[LOCK_COLLECTION].delete_one({"_id": LOCK_ID, "owner": owner})


async def run_migrations(
    mongo_url: str,
    database_name: str,
    *,
    dry_run: bool = False,
    client_factory: Callable[..., Any] = AsyncIOMotorClient,
) -> list[str]:
    """Run pending migrations and return their versions."""

    client = client_factory(mongo_url, serverSelectionTimeoutMS=10_000)
    owner = str(uuid.uuid4())
    database = client[database_name]
    applied_versions: list[str] = []
    try:
        await client.admin.command("ping")
        migrations = database[MIGRATIONS_COLLECTION]
        await migrations.create_index("version", unique=True, name="uniq_schema_version")

        pending = [
            (version, description, function)
            for version, description, function in MIGRATIONS
            if await migrations.find_one({"version": version}) is None
        ]
        if not pending:
            logger.info("No pending migrations")
            return applied_versions
        if dry_run:
            for version, description, _ in pending:
                logger.info("Pending migration %s: %s", version, description)
            return [version for version, _, _ in pending]

        if not await _acquire_lock(database, owner):
            raise RuntimeError("another migration runner holds the database lease")
        try:
            # Re-check after locking: a concurrent deploy may have finished a
            # migration while this process was waiting for the lease.
            for version, description, function in MIGRATIONS:
                if await migrations.find_one({"version": version}) is not None:
                    continue
                logger.info("Applying migration %s: %s", version, description)
                details = await function(database) or {}
                await migrations.insert_one(
                    {
                        "version": version,
                        "description": description,
                        "appliedAt": _now(),
                        "details": details,
                    }
                )
                applied_versions.append(version)
        finally:
            await _release_lock(database, owner)
        return applied_versions
    finally:
        client.close()


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="list pending migrations only")
    parser.add_argument(
        "--database",
        default=os.getenv("DATABASE_NAME") or os.getenv("MONGODB_DB_NAME", "test"),
    )
    return parser


async def _main(arguments: argparse.Namespace) -> int:
    if os.getenv("MIGRATIONS_ENABLED") != "1":
        print("Refusing to run: set MIGRATIONS_ENABLED=1", file=sys.stderr)
        return 2
    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_url:
        print("MONGODB_URL or MONGODB_URI is required", file=sys.stderr)
        return 2
    await run_migrations(mongo_url, arguments.database, dry_run=arguments.dry_run)
    return 0


def main() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    raise SystemExit(asyncio.run(_main(_parser().parse_args())))


if __name__ == "__main__":
    main()
