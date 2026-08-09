import pytest
from unittest.mock import AsyncMock
from curl_cffi.requests import RequestsError

from pokojowo_scraper.config import settings
from pokojowo_scraper.fetch.client import Fetcher


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
    fetcher._session = Session([Response(429), Response(503), Response(200)])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())
    monkeypatch.setattr(settings, "fetch_backoff_base", 0)
    monkeypatch.setattr(settings, "fetch_backoff_max", 0)

    result = await fetcher.get("https://example.test/listing")

    assert result == "<html>ok</html>"
    assert fetcher._session.calls == 3
    assert fetcher.fetch_attempts == 3
    assert fetcher.fetch_retries == 2
    assert fetcher.fetch_successes == 1


@pytest.mark.asyncio
async def test_retries_network_error_but_not_404(monkeypatch):
    fetcher = Fetcher()
    fetcher._session = Session([RequestsError("connection reset"), Response(200)])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())
    monkeypatch.setattr(settings, "fetch_backoff_base", 0)
    monkeypatch.setattr(settings, "fetch_backoff_max", 0)

    assert await fetcher.get("https://example.test/listing") == "<html>ok</html>"
    assert fetcher.fetch_retries == 1

    fetcher = Fetcher()
    fetcher._session = Session([Response(404)])
    monkeypatch.setattr(fetcher, "_respect_rate_limit", AsyncMock())
    with pytest.raises(RequestsError):
        await fetcher.get("https://example.test/missing")
    assert fetcher._session.calls == 1
