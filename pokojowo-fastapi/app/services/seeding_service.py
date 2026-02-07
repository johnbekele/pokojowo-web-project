"""
Seeding Service

Utility for seeding the database with sample data from JSON files.
Useful for development, testing, and demo purposes.
"""

import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
from app.models.listing import Listing, RoomTypeEnum, BuildingTypeEnum, RentForEnum


class SeedingService:
    """Service for seeding database with sample data."""

    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent / "data"

    async def seed_listings(
        self,
        owner_id: str,
        clear_existing: bool = False
    ) -> Dict:
        """
        Seed listings from JSON file.

        Args:
            owner_id: User ID to set as owner of seeded listings
            clear_existing: If True, delete existing listings for this owner first

        Returns:
            Dictionary with results: created count, errors, etc.
        """
        if clear_existing:
            # Delete existing listings for this owner
            await Listing.find({"owner_id": owner_id}).delete()

        json_path = self.data_dir / "seed_listings.json"

        if not json_path.exists():
            return {
                "success": False,
                "error": "Seed file not found",
                "path": str(json_path),
                "created": 0,
            }

        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Invalid JSON: {str(e)}",
                "created": 0,
            }

        created = 0
        errors = []

        for idx, listing_data in enumerate(data.get("listings", [])):
            try:
                # Parse room type
                room_type = RoomTypeEnum(listing_data.get("roomType", "Single"))

                # Parse building type
                building_type = BuildingTypeEnum(listing_data.get("buildingType", "Apartment"))

                # Parse rent for only
                rent_for_only = []
                for rent_type in listing_data.get("rentForOnly", ["Open to All"]):
                    try:
                        rent_for_only.append(RentForEnum(rent_type))
                    except ValueError:
                        rent_for_only.append(RentForEnum.OPEN_TO_ALL)

                # Parse available from date
                available_from = datetime.utcnow()
                if listing_data.get("availableFrom"):
                    try:
                        date_str = listing_data["availableFrom"].replace("Z", "+00:00")
                        available_from = datetime.fromisoformat(date_str)
                    except (ValueError, AttributeError):
                        pass

                # Create listing
                listing = Listing(
                    owner_id=owner_id,
                    address=listing_data.get("address", f"Seed Address {idx + 1}"),
                    price=float(listing_data.get("price", 1000)),
                    size=float(listing_data.get("size", 20)),
                    max_tenants=int(listing_data.get("maxTenants", 1)),
                    images=listing_data.get("images", []),
                    description=listing_data.get("description", {"en": "", "pl": ""}),
                    available_from=available_from,
                    room_type=room_type,
                    building_type=building_type,
                    rent_for_only=rent_for_only,
                    can_be_contacted=listing_data.get("canBeContacted", ["email"]),
                    close_to=listing_data.get("closeTo", []),
                    ai_help=listing_data.get("AIHelp", False),
                )

                await listing.insert()
                created += 1

            except Exception as e:
                errors.append({
                    "index": idx,
                    "address": listing_data.get("address", "Unknown"),
                    "error": str(e),
                })

        return {
            "success": True,
            "created": created,
            "errors": errors,
            "total_in_file": len(data.get("listings", [])),
            "owner_id": owner_id,
        }

    async def get_seed_stats(self) -> Dict:
        """Get statistics about available seed data."""
        json_path = self.data_dir / "seed_listings.json"

        if not json_path.exists():
            return {
                "listings_file_exists": False,
                "listings_count": 0,
            }

        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            return {
                "listings_file_exists": True,
                "listings_count": len(data.get("listings", [])),
            }
        except Exception as e:
            return {
                "listings_file_exists": True,
                "listings_count": 0,
                "error": str(e),
            }


# Singleton instance
seeding_service = SeedingService()
