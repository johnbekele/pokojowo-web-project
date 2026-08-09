import json
import logging
import re

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.logging import JsonFormatter
from app.core.request_context import RequestIdMiddleware, get_request_id, reset_request_id, set_request_id
from app.services.user_client import _headers


@pytest.mark.asyncio
async def test_request_id_is_preserved_and_returned() -> None:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)

    @app.get("/")
    async def endpoint():
        return {"request_id": get_request_id()}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/", headers={"X-Request-ID": "trace-chat-123"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "trace-chat-123"
    assert response.json() == {"request_id": "trace-chat-123"}


@pytest.mark.asyncio
async def test_request_id_is_generated_when_missing() -> None:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)

    @app.get("/")
    async def endpoint():
        return {"request_id": get_request_id()}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")

    request_id = response.headers["x-request-id"]
    assert re.fullmatch(r"[0-9a-f]{32}", request_id)
    assert response.json()["request_id"] == request_id


@pytest.mark.asyncio
async def test_chat_health_route_is_correlated() -> None:
    from main import app as service_app

    async with AsyncClient(transport=ASGITransport(app=service_app), base_url="http://test") as client:
        response = await client.get("/health", headers={"X-Request-ID": "trace-health"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "trace-health"


def test_internal_headers_propagate_request_id() -> None:
    token = set_request_id("trace-chat-internal")
    try:
        assert _headers()["X-Request-ID"] == "trace-chat-internal"
    finally:
        reset_request_id(token)


def test_json_logs_include_request_id_and_redact_credentials() -> None:
    token = set_request_id("trace-chat-log")
    try:
        record = logging.LogRecord(
            "test", logging.INFO, __file__, 1, "password=%s content=%s", ("secret", "hello"), None
        )
        payload = json.loads(JsonFormatter().format(record))
    finally:
        reset_request_id(token)

    assert payload["request_id"] == "trace-chat-log"
    assert payload["message"] == "password=<redacted> content=<redacted>"
