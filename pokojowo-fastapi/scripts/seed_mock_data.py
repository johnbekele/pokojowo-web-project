"""
Seed development mock data for frontend work.

Creates/upserts demo users, listings, likes, and mutual matches using images from
the Vite public directory. It only touches records marked with seed="frontend_mock".

Usage:
    python scripts/seed_mock_data.py
"""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from passlib.context import CryptContext

from app.core.config import settings
from app.models.chat import Chat
from app.models.like import Like, LikeStatusEnum
from app.models.listing import BuildingTypeEnum, Listing, RentForEnum, RoomTypeEnum
from app.models.listing_interaction import ListingInteraction
from app.models.message import Message
from app.models.mutual_match import MatchStatusEnum, MutualMatch
from app.models.notification import Notification
from app.models.saved_match import SavedMatch
from app.models.user import (
    BudgetModel,
    CleanlinessEnum,
    FlatmateTraitsModel,
    GenderEnum,
    GuestsFrequencyEnum,
    IndustryEnum,
    JobModel,
    LandlordProfileModel,
    LifestylePreferencesModel,
    PersonalityEnum,
    PhotoModel,
    PoliciesModel,
    PreferencesModel,
    RoleEnum,
    SocialLevelEnum,
    StatisticsModel,
    TenantProfileModel,
    User,
    VerificationModel,
)

load_dotenv()

SEED = "frontend_mock"
PASSWORD = "Test123!"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Absolute, publicly hosted photos. These used to be "/images/promo/..." paths,
# which only resolve against the Vite web frontend -- native clients hit the API
# host and got 404s, so every card fell back to the same placeholder.
UNSPLASH = "https://images.unsplash.com"
_PORTRAIT = "w=600&h=600&fit=crop&crop=faces&auto=format"
_ROOM = "w=1200&h=800&fit=crop&auto=format"

ROOM_IMAGES = [
    f"{UNSPLASH}/photo-1522708323590-d24dbb6b0267?{_ROOM}",
    f"{UNSPLASH}/photo-1560448204-e02f11c3d0e2?{_ROOM}",
    f"{UNSPLASH}/photo-1502672260266-1c1ef2d93688?{_ROOM}",
    f"{UNSPLASH}/photo-1493809842364-78817add7ffb?{_ROOM}",
]

# One distinct portrait per mock user, roughly matching their age/gender.
PROFILE_PHOTOS = {
    "mock_landlord": f"{UNSPLASH}/photo-1573496359142-b8d87734a5a2?{_PORTRAIT}",
    "mock_anna": f"{UNSPLASH}/photo-1494790108377-be9c29b29330?{_PORTRAIT}",
    "mock_piotr": f"{UNSPLASH}/photo-1500648767791-00dcc994a43e?{_PORTRAIT}",
    "mock_sofia": f"{UNSPLASH}/photo-1517841905240-472988babdf9?{_PORTRAIT}",
    "mock_kamil": f"{UNSPLASH}/photo-1507003211169-0a1dd7228f2d?{_PORTRAIT}",
}


async def setup_database() -> AsyncIOMotorClient:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.DATABASE_NAME],
        document_models=[
            User,
            Listing,
            Message,
            Chat,
            SavedMatch,
            Like,
            MutualMatch,
            ListingInteraction,
            Notification,
        ],
    )
    return client


async def upsert_user(data: dict) -> User:
    user = await User.find_one(User.email == data["email"])
    if not user:
        user = User(
            email=data["email"],
            username=data["username"],
            password=pwd_context.hash(PASSWORD),
        )

    for key, value in data.items():
        if key not in {"email", "username"}:
            setattr(user, key, value)

    user.password = pwd_context.hash(PASSWORD)
    user.is_active = True
    user.is_verified = True
    user.is_profile_complete = True
    user.profile_completion_step = 100
    user.other_details = {"seed": SEED}
    user.updated_at = datetime.utcnow()
    await user.save()
    return user


def tenant_profile(location: str, max_budget: int, interests: list[str], tidy: bool = True) -> TenantProfileModel:
    return TenantProfileModel(
        interests=interests,
        personality=[
            PersonalityEnum.NEAT if tidy else PersonalityEnum.TALKATIVE,
            PersonalityEnum.QUIET if tidy else PersonalityEnum.EXTROVERT,
            PersonalityEnum.EARLY_BIRD if tidy else PersonalityEnum.NIGHT_OWL,
        ],
        preferences=PreferencesModel(
            location=location,
            lifestyle_preferences=LifestylePreferencesModel(
                smokes=False,
                has_pets=False,
                ok_with_smoking=False,
                ok_with_pets=True,
            ),
            budget=BudgetModel(currency="PLN", min=max_budget - 900, max=max_budget),
            lease_duration_months=12,
        ),
        flatmate_traits=FlatmateTraitsModel(
            cleanliness=CleanlinessEnum.VERY_CLEAN if tidy else CleanlinessEnum.MODERATE,
            social_level=SocialLevelEnum.MODERATE if tidy else SocialLevelEnum.SOCIAL,
            guests_frequency=GuestsFrequencyEnum.RARELY if tidy else GuestsFrequencyEnum.SOMETIMES,
            shared_spaces=["kitchen", "bathroom", "living_room"],
        ),
    )


async def seed_users() -> dict[str, User]:
    landlord = await upsert_user({
        "email": "mock.landlord@pokojowo-demo.com",
        "username": "mock_landlord",
        "firstname": "Marta",
        "lastname": "Nowak",
        "age": 34,
        "gender": GenderEnum.FEMALE,
        "bio": "Responsive Warsaw landlord with bright rooms close to transit and universities.",
        "phone": "+48500111222",
        "location": "Warsaw",
        "languages": ["Polish", "English"],
        "photo": PhotoModel(url=PROFILE_PHOTOS["mock_landlord"]),
        "role": [RoleEnum.USER, RoleEnum.LANDLORD],
        "job": JobModel(industry=IndustryEnum.REAL_ESTATE, title="Property Manager"),
        "landlord_profile": LandlordProfileModel(
            company_name="Pokojowo Demo Homes",
            years_of_experience=6,
            property_types=["rooms", "apartments"],
            services_offered=["online viewing", "fast paperwork", "maintenance"],
            policies=PoliciesModel(
                pets_allowed=True,
                smoking_allowed=False,
                parties_allowed=False,
                minimum_lease_term=6,
                security_deposit=1,
            ),
            verification=VerificationModel(is_verified_landlord=True),
            statistics=StatisticsModel(
                total_properties=4,
                active_listings=4,
                successful_rentals=28,
                average_rating=4.8,
                total_reviews=19,
            ),
        ),
    })

    tenants = [
        await upsert_user({
            "email": "mock.anna@pokojowo-demo.com",
            "username": "mock_anna",
            "firstname": "Anna",
            "lastname": "Kowalska",
            "age": 25,
            "gender": GenderEnum.FEMALE,
            "bio": "UX designer, early riser, loves plants, quiet dinners, and clean shared spaces.",
            "phone": "+48500111333",
            "location": "Warsaw",
            "languages": ["Polish", "English"],
            "photo": PhotoModel(url=PROFILE_PHOTOS["mock_anna"]),
            "role": [RoleEnum.USER, RoleEnum.TENANT],
            "job": JobModel(industry=IndustryEnum.DESIGN, title="UX Designer"),
            "tenant_profile": tenant_profile("Warsaw", 3200, ["design", "plants", "coffee", "yoga"]),
            "match_score": 94.0,
        }),
        await upsert_user({
            "email": "mock.piotr@pokojowo-demo.com",
            "username": "mock_piotr",
            "firstname": "Piotr",
            "lastname": "Zielinski",
            "age": 28,
            "gender": GenderEnum.MALE,
            "bio": "Software engineer working hybrid. Into cycling, board games, and weekend cooking.",
            "phone": "+48500111444",
            "location": "Warsaw",
            "languages": ["Polish", "English"],
            "photo": PhotoModel(url=PROFILE_PHOTOS["mock_piotr"]),
            "role": [RoleEnum.USER, RoleEnum.TENANT],
            "job": JobModel(industry=IndustryEnum.TECHNOLOGY, title="Frontend Engineer"),
            "tenant_profile": tenant_profile("Warsaw", 3500, ["cycling", "technology", "cooking", "board games"]),
            "match_score": 89.0,
        }),
        await upsert_user({
            "email": "mock.sofia@pokojowo-demo.com",
            "username": "mock_sofia",
            "firstname": "Sofia",
            "lastname": "Garcia",
            "age": 23,
            "gender": GenderEnum.FEMALE,
            "bio": "Exchange student looking for friendly flatmates near public transport.",
            "phone": "+48500111555",
            "location": "Krakow",
            "languages": ["English", "Spanish", "Polish"],
            "photo": PhotoModel(url=PROFILE_PHOTOS["mock_sofia"]),
            "role": [RoleEnum.USER, RoleEnum.TENANT],
            "job": JobModel(industry=IndustryEnum.STUDENT, title="Student"),
            "tenant_profile": tenant_profile("Krakow", 2600, ["music", "languages", "travel", "study"], tidy=False),
            "match_score": 82.0,
        }),
        await upsert_user({
            "email": "mock.kamil@pokojowo-demo.com",
            "username": "mock_kamil",
            "firstname": "Kamil",
            "lastname": "Wojcik",
            "age": 30,
            "gender": GenderEnum.MALE,
            "bio": "Marketing specialist, social but respectful, usually out during the day.",
            "phone": "+48500111666",
            "location": "Wroclaw",
            "languages": ["Polish", "English"],
            "photo": PhotoModel(url=PROFILE_PHOTOS["mock_kamil"]),
            "role": [RoleEnum.USER, RoleEnum.TENANT],
            "job": JobModel(industry=IndustryEnum.MARKETING, title="Marketing Specialist"),
            "tenant_profile": tenant_profile("Wroclaw", 2900, ["fitness", "marketing", "events", "movies"], tidy=False),
            "match_score": 77.0,
        }),
    ]

    return {"landlord": landlord, "tenants": tenants}


async def seed_listings(owner: User) -> list[Listing]:
    await Listing.find({"ownerId": str(owner.id)}).delete()

    listings_data = [
        {
            "address": "Mokotow, Warsaw - bright room near metro",
            "price": 2450,
            "size": 18,
            "max_tenants": 1,
            "images": [ROOM_IMAGES[0], ROOM_IMAGES[1]],
            "description": {
                "en": "Sunny private room in a renovated three-bedroom apartment. Shared kitchen, fast Wi-Fi, and 8 minutes to metro.",
                "pl": "Sloneczny pokoj w odnowionym mieszkaniu trzypokojowym. Wspolna kuchnia, szybki internet i 8 minut do metra.",
            },
            "available_from": datetime.utcnow() + timedelta(days=7),
            "room_type": RoomTypeEnum.SINGLE,
            "building_type": BuildingTypeEnum.APARTMENT,
            "rent_for_only": [RentForEnum.STUDENT, RentForEnum.OPEN_TO_ALL],
            "close_to": ["Metro Raclawicka", "SGH", "Pole Mokotowskie"],
        },
        {
            "address": "Praga Polnoc, Warsaw - loft style room",
            "price": 2100,
            "size": 22,
            "max_tenants": 1,
            "images": [ROOM_IMAGES[1], ROOM_IMAGES[2]],
            "description": {
                "en": "Loft-style room with exposed brick, high ceilings, and quick tram access to the city center.",
                "pl": "Pokoj w stylu loftowym z cegla, wysokim sufitem i szybkim dojazdem tramwajem do centrum.",
            },
            "available_from": datetime.utcnow() + timedelta(days=14),
            "room_type": RoomTypeEnum.DOUBLE,
            "building_type": BuildingTypeEnum.LOFT,
            "rent_for_only": [RentForEnum.OPEN_TO_ALL],
            "close_to": ["Dworzec Wilenski", "Praga Koneser", "Tram stop"],
        },
        {
            "address": "Kazimierz, Krakow - cozy student room",
            "price": 1850,
            "size": 15,
            "max_tenants": 1,
            "images": [ROOM_IMAGES[2], ROOM_IMAGES[3]],
            "description": {
                "en": "Cozy furnished room near cafes and universities. Best for a student or young professional.",
                "pl": "Przytulny umeblowany pokoj blisko kawiarni i uczelni. Idealny dla studenta lub mlodego specjalisty.",
            },
            "available_from": datetime.utcnow() + timedelta(days=21),
            "room_type": RoomTypeEnum.SINGLE,
            "building_type": BuildingTypeEnum.BLOCK,
            "rent_for_only": [RentForEnum.STUDENT, RentForEnum.WOMEN],
            "close_to": ["Kazimierz", "UJ", "Vistula boulevards"],
        },
        {
            "address": "Nadodrze, Wroclaw - calm room with balcony",
            "price": 1950,
            "size": 17,
            "max_tenants": 1,
            "images": [ROOM_IMAGES[3], ROOM_IMAGES[0]],
            "description": {
                "en": "Quiet room in a friendly shared flat, balcony access, and a short walk to cafes and tram lines.",
                "pl": "Cichy pokoj w przyjaznym mieszkaniu, dostep do balkonu i blisko kawiarni oraz tramwajow.",
            },
            "available_from": datetime.utcnow() + timedelta(days=10),
            "room_type": RoomTypeEnum.SINGLE,
            "building_type": BuildingTypeEnum.APARTMENT,
            "rent_for_only": [RentForEnum.OPEN_TO_ALL],
            "close_to": ["Nadodrze", "Tram lines", "City center"],
        },
    ]

    listings = []
    for data in listings_data:
        listing = Listing(
            owner_id=str(owner.id),
            can_be_contacted=["email", "phone"],
            ai_help=True,
            phone=owner.phone,
            is_scraped=False,
            **data,
        )
        await listing.insert()
        listings.append(listing)

    return listings


async def seed_matches(tenants: list[User]) -> None:
    ids = [str(user.id) for user in tenants]
    await Like.find({"$or": [{"likerId": {"$in": ids}}, {"likedUserId": {"$in": ids}}]}).delete()
    await MutualMatch.find({"$or": [{"user1Id": {"$in": ids}}, {"user2Id": {"$in": ids}}]}).delete()

    pairs = [
        (tenants[0], tenants[1], 94.0),
        (tenants[0], tenants[2], 86.0),
        (tenants[1], tenants[3], 79.0),
    ]

    for user_a, user_b, score in pairs:
        a_id = str(user_a.id)
        b_id = str(user_b.id)
        await Like(liker_id=a_id, liked_user_id=b_id, status=LikeStatusEnum.MUTUAL, compatibility_score=score).insert()
        await Like(liker_id=b_id, liked_user_id=a_id, status=LikeStatusEnum.MUTUAL, compatibility_score=score).insert()
        await MutualMatch(
            user_1_id=min(a_id, b_id),
            user_2_id=max(a_id, b_id),
            status=MatchStatusEnum.ACTIVE,
            compatibility_score=score,
        ).insert()


async def main() -> None:
    client = await setup_database()
    try:
        seeded = await seed_users()
        listings = await seed_listings(seeded["landlord"])
        await seed_matches(seeded["tenants"])

        print("Mock data seeded successfully")
        print(f"Users: {1 + len(seeded['tenants'])}")
        print(f"Listings: {len(listings)}")
        print("Mutual matches: 3")
        print(f"Password for all mock users: {PASSWORD}")
        print("Primary mock login: mock.anna@pokojowo-demo.com / Test123!")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
