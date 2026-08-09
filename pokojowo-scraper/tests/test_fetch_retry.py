from unittest.mock import AsyncMock

import pytest
from curl_cffi.requests import RequestsError

from pokojowo_scraper.config import settings
from pokojowo_scraper.fetch.client import Fetcher, RobotsDisallowedError


class Response:
    def __init__(self, status_code, text="<html>ok</html>"):
        self.status_code = status_code
        self.text = text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RequestsError(f"HTTP {self.status_code}")


class Session:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = 0

    async def get(self, _url):
        self.calls += 1
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response


@pytest.mark.asyncio
async def test_retries_429_and_5xx_with_backoff(monkeypatch):
    fetcher = Fetcher()
    fetcher._session = Session([
        Response(200, "User-agent: *\nAllow: /\n"),
        Response(429),
        Response(503),
        Response(200),
    ])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())
    monkeypatch.setattr(settings, "fetch_backoff_base", 0)
    monkeypatch.setattr(settings, "fetch_backoff_max", 0)

    result = await fetcher.get("https://example.test/listing")

    assert result == "<html>ok</html>"
    assert fetcher._session.calls == 4
    assert fetcher.fetch_attempts == 3
    assert fetcher.fetch_retries == 2
    assert fetcher.fetch_successes == 1


@pytest.mark.asyncio
async def test_retries_network_error_but_not_404(monkeypatch):
    fetcher = Fetcher()
    fetcher._session = Session([
        Response(200, "User-agent: *\nAllow: /\n"),
        RequestsError("connection reset"),
        Response(200),
    ])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())
    monkeypatch.setattr(settings, "fetch_backoff_base", 0)
    monkeypatch.setattr(settings, "fetch_backoff_max", 0)

    assert await fetcher.get("https://example.test/listing") == "<html>ok</html>"
    assert fetcher.fetch_retries == 1

    fetcher = Fetcher()
    fetcher._session = Session([
        Response(200, "User-agent: *\nAllow: /\n"),
        Response(404),
    ])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())
    with pytest.raises(RequestsError):
        await fetcher.get("https://example.test/missing")
    assert fetcher._session.calls == 2


@pytest.mark.asyncio
async def test_disallowed_path_is_not_fetched(monkeypatch):
    fetcher = Fetcher()
    fetcher._session = Session([
        Response(200, "User-agent: *\nDisallow: /private\n"),
        Response(200),
    ])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())

    with pytest.raises(RobotsDisallowedError):
        await fetcher.get("https://example.test/private/listing")

    assert fetcher._session.calls == 1
    assert fetcher.robots_checked == 1
    assert fetcher.robots_blocked == 1


@pytest.mark.asyncio
async def test_robots_policy_is_cached_per_origin(monkeypatch):
    fetcher = Fetcher()
    fetcher._session = Session([
        Response(200, "User-agent: *\nAllow: /\n"),
        Response(200, "<html>one</html>"),
        Response(200, "<html>two</html>"),
    ])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())

    assert await fetcher.get("https://example.test/one") == "<html>one</html>"
    assert await fetcher.get("https://example.test/two") == "<html>two</html>"
    assert fetcher._session.calls == 3
    assert fetcher.robots_checked == 1


@pytest.mark.asyncio
async def test_missing_robots_file_uses_standard_allow_policy(monkeypatch):
    fetcher = Fetcher()
    fetcher._session = Session([Response(404), Response(200)])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())

    assert await fetcher.get("https://example.test/listing") == "<html>ok</html>"
    assert fetcher._session.calls == 2
    assert fetcher.robots_blocked == 0
