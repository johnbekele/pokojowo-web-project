"""Contract tests for calls from chat to the main API."""
import pytest

from app.core.request_context import reset_request_id, set_request_id
from app.services import user_client


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeAsyncClient:
    calls = []
    responses = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    async def get(self, url, **kwargs):
        type(self).calls.append({"url": url, **kwargs})
        return type(self).responses.pop(0)


@pytest.fixture(autouse=True)
def fake_http_client(monkeypatch):
    FakeAsyncClient.calls = []
    FakeAsyncClient.responses = []
    monkeypatch.setattr(user_client.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(user_client.settings, "MAIN_API_URL", "https://api.example.test")
    monkeypatch.setattr(user_client.settings, "INTERNAL_API_KEY", "internal-test-key")


@pytest.mark.asyncio
async def test_get_users_batch_deduplicates_ids_and_propagates_request_id():
    FakeAsyncClient.responses.append(FakeResponse({"users": [{"id": "alice"}]}))
    token = set_request_id("chat-contract-123")
    try:
        result = await user_client.get_users_batch(["alice", "alice", "missing"])
    finally:
        reset_request_id(token)

    assert result == {"alice": {"id": "alice"}}
    assert FakeAsyncClient.calls == [
        {
            "url": "https://api.example.test/api/internal/users/batch",
            "params": {"ids": "alice,missing"},
            "headers": {
                "X-Internal-Key": "internal-test-key",
                "X-Request-ID": "chat-contract-123",
            },
        }
    ]


@pytest.mark.asyncio
async def test_empty_batch_does_not_make_a_request():
    assert await user_client.get_users_batch([]) == {}
    assert FakeAsyncClient.calls == []


@pytest.mark.asyncio
async def test_block_check_uses_the_internal_contract():
    FakeAsyncClient.responses.append(FakeResponse({"blocked": True}))

    assert await user_client.is_blocked_between("alice", "bob") is True
    assert FakeAsyncClient.calls[0] == {
        "url": "https://api.example.test/api/internal/users/block-check",
        "params": {"user_a": "alice", "user_b": "bob"},
        "headers": {"X-Internal-Key": "internal-test-key"},
    }


@pytest.mark.asyncio
async def test_verified_check_handles_not_found_as_unverified():
    FakeAsyncClient.responses.append(FakeResponse({}, status_code=404))

    assert await user_client.is_user_verified("deleted") is False
    assert FakeAsyncClient.calls[0]["url"].endswith("/api/internal/users/deleted/verified")


@pytest.mark.asyncio
async def test_user_exists_is_derived_from_batch_profiles():
    FakeAsyncClient.responses.append(FakeResponse({"users": [{"id": "alice"}]}))

    assert await user_client.user_exists("alice") is True
    assert FakeAsyncClient.calls[0]["params"] == {"ids": "alice"}
