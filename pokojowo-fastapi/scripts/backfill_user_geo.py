"""Geocode tenants' preferred areas so they appear on the flatmate map.

Tenants who onboarded before the map feature only have a free-text preferred
location ("City center, Mokotow"). This resolves it to a point and stores it on
tenantProfile.preferences.locationGeo.

The point marks an area someone is searching in, never their home address.

Usage:
    python scripts/backfill_user_geo.py [--limit N] [--dry-run] [--force]

Nominatim allows 1 request/second, but most tenants share a handful of cities
so the cache absorbs nearly all of it after the first few. Do NOT run this
alongside backfill_listing_geo.py: the rate limiter is per-process, so two
processes would together exceed the allowed request rate.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.geocode_cache import GeocodeCacheEntry
from app.models.listing import Listing
from app.models.user import User
from app.services.geo_enrichment import resolve_preference_geo


async def setup_database():
    mongodb_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongodb_url:
        print("Error: MONGODB_URL not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongodb_url)
    db_name = os.getenv("DATABASE_NAME") or os.getenv("MONGODB_DB_NAME", "test")
    await init_beanie(
        database=client[db_name],
        document_models=[User, Listing, GeocodeCacheEntry],
    )
    print(f"Connected to database: {db_name}")
    return client


async def backfill(limit: int, dry_run: bool, force: bool):
    query = {
        "$or": [
            {"tenantProfile.preferences.location": {"$nin": [None, ""]}},
            {"tenantProfile.preferences.districts.0": {"$exists": True}},
        ]
    }
    if not force:
        query["tenantProfile.preferences.locationGeo"] = None

    users = await User.find(query).limit(limit).to_list() if limit else await User.find(query).to_list()
    print(f"{len(users)} tenant(s) with a preferred area to resolve")

    resolved = 0
    failed = 0
    for index, user in enumerate(users, start=1):
        prefs = user.tenant_profile.preferences
        label = ", ".join(filter(None, [
            prefs.districts[0] if prefs.districts else None,
            prefs.location,
        ])) or "(empty)"

        if dry_run:
            print(f"[{index}/{len(users)}] would geocode {user.username}: {label}")
            continue

        if await resolve_preference_geo(user, force=force):
            resolved += 1
            coords = prefs.location_geo["coordinates"]
            print(f"[{index}/{len(users)}] {user.username}: {label} -> "
                  f"{coords[1]:.5f},{coords[0]:.5f} ({prefs.geo_precision})")
        else:
            failed += 1
            print(f"[{index}/{len(users)}] no match for {user.username}: {label}")

    print(f"\nDone. Resolved {resolved}, unresolved {failed}.")


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="Stop after N users (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="List what would be geocoded")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-geocode users who already have coordinates",
    )
    args = parser.parse_args()

    client = await setup_database()
    try:
        await backfill(args.limit, args.dry_run, args.force)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
