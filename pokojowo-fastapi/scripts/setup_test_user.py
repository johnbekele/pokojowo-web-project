"""
Script to create/update a test user with complete profile for matching testing.

Usage:
    python scripts/setup_test_user.py

Set MONGODB_URL environment variable or it will use the one from .env
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from passlib.context import CryptContext

# Import models after path setup
from app.models.user import (
    User, RoleEnum, GenderEnum, CleanlinessEnum, SocialLevelEnum,
    GuestsFrequencyEnum, TenantProfileModel, PreferencesModel,
    FlatmateTraitsModel, DealBreakersModel, BudgetModel, PhotoModel
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test user credentials
TEST_USER = {
    "email": "test@pokojowo.com",
    "password": "Test123!",
    "username": "testuser",
    "firstname": "Test",
    "lastname": "User",
}


async def setup_database():
    """Initialize database connection"""
    mongodb_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongodb_url:
        print("Error: MONGODB_URL not set")
        sys.exit(1)

    # Add SSL options if using Atlas (mongodb+srv)
    if "mongodb+srv" in mongodb_url or "mongodb.net" in mongodb_url:
        # Append tlsAllowInvalidCertificates if not already present
        if "tls" not in mongodb_url.lower():
            separator = "&" if "?" in mongodb_url else "?"
            mongodb_url = f"{mongodb_url}{separator}tls=true&tlsAllowInvalidCertificates=true"

    client = AsyncIOMotorClient(mongodb_url)
    db_name = os.getenv("MONGODB_DB_NAME", "test")  # Match production default
    await init_beanie(database=client[db_name], document_models=[User])
    print(f"Connected to database: {db_name}")
    return client


async def create_or_update_test_user():
    """Create or update test user with complete profile"""

    # Check if user exists
    existing_user = await User.find_one(User.email == TEST_USER["email"])

    if existing_user:
        print(f"Found existing user: {existing_user.email}")
        user = existing_user
        # Update password for existing user too
        user.password = pwd_context.hash(TEST_USER["password"])
        print(f"Updated password for existing user")
    else:
        print("Creating new test user...")
        user = User(
            email=TEST_USER["email"],
            username=TEST_USER["username"],
            password=pwd_context.hash(TEST_USER["password"]),
        )

    # Update user profile with complete data
    user.firstname = TEST_USER["firstname"]
    user.lastname = TEST_USER["lastname"]
    user.age = 28
    user.gender = GenderEnum.MALE
    user.bio = "I'm a friendly software developer looking for a clean, quiet flatmate. I enjoy cooking, reading, and occasional movie nights. Work from home most days."
    user.phone = "+48123456789"
    user.location = "Warsaw"
    user.languages = ["English", "Polish"]
    user.preferred_language = "English"
    user.photo = PhotoModel(url="https://api.dicebear.com/7.x/avataaars/svg?seed=testuser")

    # Set roles - TENANT is required for matching
    user.role = [RoleEnum.USER, RoleEnum.TENANT]

    # Set tenant profile with preferences
    user.tenant_profile = TenantProfileModel(
        interests=["cooking", "reading", "movies", "technology"],
        personality=["introvert", "neat", "quiet"],
        preferences=PreferencesModel(
            location="Warsaw",
            budget=BudgetModel(
                currency="PLN",
                min=1500,
                max=3000
            ),
            lease_duration_months=12
        ),
        flatmate_traits=FlatmateTraitsModel(
            cleanliness=CleanlinessEnum.CLEAN,
            social_level=SocialLevelEnum.MODERATE,
            guests_frequency=GuestsFrequencyEnum.SOMETIMES,
        ),
        deal_breakers=DealBreakersModel(
            no_smokers=True,
            no_pets=False,
            no_parties=True,
            same_gender_only=False,
            quiet_hours_required=True
        )
    )

    # Mark profile as complete
    user.is_profile_complete = True
    user.profile_completion_step = 100
    user.is_verified = True
    user.is_active = True

    user.updated_at = datetime.utcnow()
    if not existing_user:
        user.created_at = datetime.utcnow()

    await user.save()

    print("\n" + "=" * 50)
    print("TEST USER CREATED/UPDATED SUCCESSFULLY")
    print("=" * 50)
    print(f"Email:    {user.email}")
    print(f"Password: {TEST_USER['password']}")
    print(f"Username: {user.username}")
    print(f"Roles:    {[r.value for r in user.role]}")
    print(f"Profile Complete: {user.is_profile_complete}")
    print(f"User ID:  {user.id}")
    print("=" * 50)

    return user


async def create_second_test_user():
    """Create a second test user to have someone to match with"""

    email = "testmatch@pokojowo.com"
    existing_user = await User.find_one(User.email == email)

    if existing_user:
        print(f"Found existing match user: {existing_user.email}")
        user = existing_user
    else:
        print("Creating second test user for matching...")
        user = User(
            email=email,
            username="testmatch",
            password=pwd_context.hash("Test123!"),
        )

    user.firstname = "Match"
    user.lastname = "Partner"
    user.age = 26
    user.gender = GenderEnum.FEMALE
    user.bio = "Student looking for a quiet place to study. I enjoy cooking and keeping things tidy. Non-smoker, early riser."
    user.phone = "+48987654321"
    user.location = "Warsaw"
    user.languages = ["English", "Polish", "German"]
    user.preferred_language = "English"
    user.photo = PhotoModel(url="https://api.dicebear.com/7.x/avataaars/svg?seed=testmatch")

    user.role = [RoleEnum.USER, RoleEnum.TENANT]

    user.tenant_profile = TenantProfileModel(
        interests=["cooking", "studying", "yoga", "music"],
        personality=["introvert", "neat", "early_bird"],
        preferences=PreferencesModel(
            location="Warsaw",
            budget=BudgetModel(
                currency="PLN",
                min=1200,
                max=2500
            ),
            lease_duration_months=12
        ),
        flatmate_traits=FlatmateTraitsModel(
            cleanliness=CleanlinessEnum.VERY_CLEAN,
            social_level=SocialLevelEnum.QUIET,
            guests_frequency=GuestsFrequencyEnum.RARELY,
        ),
        deal_breakers=DealBreakersModel(
            no_smokers=True,
            no_pets=True,
            no_parties=True,
            same_gender_only=False,
            quiet_hours_required=True
        )
    )

    user.is_profile_complete = True
    user.profile_completion_step = 100
    user.is_verified = True
    user.is_active = True
    user.updated_at = datetime.utcnow()

    await user.save()

    print(f"\nSecond test user created: {user.email}")
    return user


async def main():
    client = await setup_database()

    try:
        # Create main test user
        await create_or_update_test_user()

        # Create a second user to match with
        await create_second_test_user()

        print("\nDone! You can now login with:")
        print(f"  Email: {TEST_USER['email']}")
        print(f"  Password: {TEST_USER['password']}")

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
