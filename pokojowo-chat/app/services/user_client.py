"""HTTP client for main API internal endpoints."""
from typing import Optional
import httpx
from app.core.config import settings


def _headers() -> dict:
    return {"X-Internal-Key": settings.INTERNAL_API_KEY}


async def get_users_batch(user_ids: list[str]) -> dict[str, dict]:
    """Fetch user profiles by ID. Returns {user_id: profile_dict}."""
    if not user_ids:
        return {}
    unique_ids = list(dict.fromkeys(user_ids))
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.MAIN_API_URL}/api/internal/users/batch",
            params={"ids": ",".join(unique_ids)},
            headers=_headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        return {u["id"]: u for u in data.get("users", [])}


async def is_blocked_between(user_a: str, user_b: str) -> bool:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.MAIN_API_URL}/api/internal/users/block-check",
            params={"user_a": user_a, "user_b": user_b},
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json().get("blocked", False)


async def is_user_verified(user_id: str) -> bool:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.MAIN_API_URL}/api/internal/users/{user_id}/verified",
            headers=_headers(),
        )
        if resp.status_code == 404:
            return False
        resp.raise_for_status()
        return resp.json().get("verified", False)


async def user_exists(user_id: str) -> bool:
    profiles = await get_users_batch([user_id])
    return user_id in profiles
