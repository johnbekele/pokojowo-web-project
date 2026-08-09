import pytest

from app.models.listing_interaction import InteractionTypeEnum, ListingInteraction
from app.models.user import RoleEnum
from tests.integration.conftest import listing_for


pytestmark = pytest.mark.integration


async def test_listing_owner_controls_updates_and_stats(client, make_user, login):
    owner = await make_user(username="listing-owner", roles=[RoleEnum.LANDLORD])
    stranger = await make_user(username="listing-stranger")
    listing = listing_for(owner)
    await listing.insert()

    await ListingInteraction(
        user_id=str(stranger.id),
        listing_id=str(listing.id),
        interaction_type=InteractionTypeEnum.VIEW,
    ).insert()
    await ListingInteraction(
        user_id=str(stranger.id),
        listing_id=str(listing.id),
        interaction_type=InteractionTypeEnum.LIKE,
    ).insert()

    stranger_tokens = await login(stranger)
    stranger_headers = {"Authorization": f"Bearer {stranger_tokens['access_token']}"}
    forbidden_stats = await client.get(
        f"/api/listing-interactions/{listing.id}/stats", headers=stranger_headers
    )
    assert forbidden_stats.status_code == 403

    forbidden_update = await client.put(
        f"/api/listings/{listing.id}",
        headers=stranger_headers,
        json={"address": "ul. Nieautoryzowana 9"},
    )
    assert forbidden_update.status_code == 403

    owner_tokens = await login(owner)
    owner_headers = {"Authorization": f"Bearer {owner_tokens['access_token']}"}
    stats = await client.get(
        f"/api/listing-interactions/{listing.id}/stats", headers=owner_headers
    )
    assert stats.status_code == 200
    assert stats.json() == {
        "totalViews": 1,
        "uniqueViewers": 1,
        "totalLikes": 1,
        "totalInquiries": 0,
    }

    updated = await client.put(
        f"/api/listings/{listing.id}",
        headers=owner_headers,
        json={"address": "ul. Właściciela 2"},
    )
    assert updated.status_code == 200
    stored = await listing.get(listing.id)
    assert stored.address == "ul. Właściciela 2"


async def test_verified_landlord_required_to_create_listing(client, make_user, login):
    unverified_landlord = await make_user(
        username="unverified-landlord",
        roles=[RoleEnum.LANDLORD],
        verified=False,
    )
    tokens = await login(unverified_landlord)
    response = await client.post(
        "/api/listings/",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={
            "address": "ul. Weryfikacyjna 3",
            "price": 2000,
            "size": 35,
            "maxTenants": 1,
            "images": [],
            "description": {"en": "Test", "pl": "Test"},
            "availableFrom": "2026-01-01T00:00:00Z",
            "roomType": "Single",
            "buildingType": "Apartment",
            "rentForOnly": ["Open to All"],
            "canBeContacted": ["Message"],
        },
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "EMAIL_NOT_VERIFIED"
