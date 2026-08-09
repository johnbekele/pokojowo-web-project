import pytest
from fastapi import HTTPException
from starlette.requests import Request

from pokojowo_scraper.api.app import require_admin_key, require_dashboard_key
from pokojowo_scraper.config import settings


def request(path="/api/scraper/health"):
    return Request({"type": "http", "path": path, "headers": []})


@pytest.mark.asyncio
async def test_dashboard_auth_fails_closed_when_key_is_missing(monkeypatch):
    monkeypatch.setattr(settings, "dashboard_api_key", "")

    with pytest.raises(HTTPException) as exc:
        await require_dashboard_key(request(), x_internal_key="anything")

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_auth_accepts_header_key(monkeypatch):
    monkeypatch.setattr(settings, "dashboard_api_key", "read-key")

    assert await require_dashboard_key(request(), x_internal_key="read-key") is None


@pytest.mark.asyncio
async def test_admin_auth_does_not_accept_read_key(monkeypatch):
    monkeypatch.setattr(settings, "dashboard_admin_key", "admin-key")

    with pytest.raises(HTTPException) as exc:
        await require_admin_key(x_internal_key="read-key")

    assert exc.value.status_code == 403
