"""Tests for the /health/details endpoint (issue #72).

These exercise the endpoint through FastAPI's TestClient. No live Mongo is
required: the endpoint pings the DB inside a try/except and reports
"degraded" when it cannot connect, so the response shape is stable either way.
"""
import time

from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


def test_health_details_has_expected_keys():
    resp = client.get("/health/details")
    assert resp.status_code == 200
    body = resp.json()
    # Existing keys unchanged
    assert "status" in body
    assert "database" in body
    assert "version" in body
    # New key
    assert "uptime_seconds" in body
    assert isinstance(body["uptime_seconds"], int)
    assert body["uptime_seconds"] >= 0


def test_uptime_increases_between_calls():
    first = client.get("/health/details").json()["uptime_seconds"]
    time.sleep(1.1)
    second = client.get("/health/details").json()["uptime_seconds"]
    assert second >= first
    assert second > first  # at least ~1s elapsed
