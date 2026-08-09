"""Fixtures for API integration tests.

The CI job supplies a disposable MongoDB service.  Keeping the database
initialisation here (rather than in the application import path) means the
existing unit suite remains fast and does not need MongoDB at all.
"""

from collections.abc import Callable, Coroutine
from datetime import datetime
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo, db
from app.core.security import create_verification_token, get_password_hash
from app.models.listing import Listing
from app.models.user import RoleEnum, User
from main import app


@pytest_asyncio.fixture(autouse=True)
async def mongodb():
    """Initialise Beanie on the same event loop as the current test."""

    await connect_to_mongo()
    yield
    await close_mongo_connection()


@pytest_asyncio.fixture(autouse=True)
async def clean_database(mongodb):
    """Remove every document between tests while preserving Beanie indexes."""

    database = db.client[settings.DATABASE_NAME]
    for collection_name in await database.list_collection_names():
        await database[collection_name].delete_many({})


@pytest_asyncio.fixture
async def client(mongodb):
    """Call the ASGI app directly against the test MongoDB."""

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client


@pytest_asyncio.fixture
async def make_user() -> Callable[..., Coroutine[Any, Any, User]]:
    """Create a persisted user for ownership and authorization scenarios."""

    async def _make_user(
        *,
        username: str,
        password: str = "Correct Horse Battery Staple!",
        roles: list[RoleEnum] | None = None,
        verified: bool = True,
        active: bool = True,
    ) -> User:
        email = f"{username}@example.com"
        user = User(
            username=username,
            email=email,
            password=get_password_hash(password),
            role=roles or [RoleEnum.USER],
            is_verified=verified,
            is_active=active,
            verification_token=None if verified else create_verification_token(email),
        )
        await user.insert()
        return user

    return _make_user


@pytest_asyncio.fixture
async def verified_user(make_user):
    """A normal active, verified account for endpoint integration tests."""
    return await make_user(username="verified-fixture", verified=True)


@pytest_asyncio.fixture
async def unverified_user(make_user):
    """An active account that must be refused by verified-only routes."""
    return await make_user(username="unverified-fixture", verified=False)


@pytest_asyncio.fixture
async def landlord_user(make_user):
    """A verified landlord account for role and listing scenarios."""
    return await make_user(username="landlord-fixture", roles=[RoleEnum.LANDLORD])


@pytest_asyncio.fixture
async def admin_user(make_user):
    """An active administrator for paired role-authorization assertions."""
    return await make_user(username="admin-fixture", roles=[RoleEnum.ADMIN])


@pytest_asyncio.fixture
async def login(client):
    """Return a bearer-token helper that uses the real login endpoint."""

    async def _login(user: User, password: str = "Correct Horse Battery Staple!") -> dict:
        response = await client.post(
            "/api/auth/login",
            json={"email": str(user.email), "password": password},
        )
        assert response.status_code == 200, response.text
        return response.json()

    return _login


def listing_for(owner: User) -> Listing:
    """Build a minimal valid listing for endpoint authorization tests."""

    return Listing(
        owner_id=str(owner.id),
        address="ul. Testowa 1, Warszawa",
        city="Warsaw",
        district="Mokotów",
        price=2500,
        size=42,
        max_tenants=1,
        images=[],
        description={"en": "Integration fixture", "pl": "Fixture integracyjny"},
        available_from=datetime(2026, 1, 1),
        room_type="Single",
        building_type="Apartment",
        rent_for_only=["Open to All"],
        can_be_contacted=["Message"],
    )
