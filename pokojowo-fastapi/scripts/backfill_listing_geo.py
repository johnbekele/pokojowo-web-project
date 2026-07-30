"""Give existing listings coordinates so they show up on the map.

Listings created before the map feature only have a free-text address. This
resolves each one through Nominatim and stores the resulting point plus the
precision it achieved.

Usage:
    python scripts/backfill_listing_geo.py [--limit N] [--dry-run] [--force]

Nominatim allows 1 request/second, so expect roughly one listing per second
on a cold cache — a few thousand listings takes an hour. Results are cached
forever, so re-runs are fast. Do NOT run this alongside
backfill_user_geo.py: the rate limiter is per-process, so two processes
would together exceed the allowed request rate.
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
from app.services.geo_enrichment import resolve_listing_geo


async def setup_database():
    mongodb_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongodb_url:
        print("Error: MONGODB_URL not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongodb_url)
    db_name = os.getenv("DATABASE_NAME") or os.getenv("MONGODB_DB_NAME", "test")
    await init_beanie(
        database=client[db_name],
        document_models=[Listing, User, GeocodeCacheEntry],
    )
    print(f"Connected to database: {db_name}")
    return client


async def backfill(limit: int, dry_run: bool, force: bool):
    query = {} if force else {"$or": [
        {"locationGeo": None},
        {"locationGeo": {"$exists": False}},
    ]}

    total = await Listing.find(query).count()
    print(f"{total} listing(s) need coordinates" + (f", processing up to {limit}" if limit else ""))

    listings = await Listing.find(query).limit(limit).to_list() if limit else await Listing.find(query).to_list()

    resolved = 0
    failed = 0
    for index, listing in enumerate(listings, start=1):
        label = listing.address or f"{listing.district or ''} {listing.city or ''}".strip()
        if dry_run:
            print(f"[{index}/{len(listings)}] would geocode: {label}")
            continue

        if await resolve_listing_geo(listing, force=force):
            resolved += 1
            coords = listing.location_geo["coordinates"]
            print(f"[{index}/{len(listings)}] {label} -> "
                  f"{coords[1]:.5f},{coords[0]:.5f} ({listing.geo_precision})")
        else:
            failed += 1
            print(f"[{index}/{len(listings)}] no match: {label}")

    print(f"\nDone. Resolved {resolved}, unresolved {failed}.")


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="Stop after N listings (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="List what would be geocoded")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-geocode listings that already have coordinates",
    )
    args = parser.parse_args()

    client = await setup_database()
    try:
        await backfill(args.limit, args.dry_run, args.force)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
