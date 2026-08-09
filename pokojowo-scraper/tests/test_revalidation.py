import pytest

from pokojowo_scraper.fetch.client import BlockedError, NotFoundError
from pokojowo_scraper.revalidation import check_source, has_delisted_marker


class FakeFetcher:
    def __init__(self, result):
        self.result = result

    async def get(self, _url):
        if isinstance(self.result, BaseException):
            raise self.result
        return self.result


def test_delisted_marker_uses_visible_text_only():
    assert has_delisted_marker("<html><body>Oferta została zakończona</body></html>")
    assert not has_delisted_marker("<script>const marker = 'listing has expired'</script>")


@pytest.mark.asyncio
async def test_404_is_unavailable():
    result = await check_source(FakeFetcher(NotFoundError("https://example.test/a", 404)), "https://example.test/a")
    assert result.available is False
    assert result.reason == "http_404"


@pytest.mark.asyncio
async def test_transient_and_blocked_checks_are_deferred():
    transient = await check_source(FakeFetcher(RuntimeError("timeout")), "https://example.test/a")
    blocked = await check_source(FakeFetcher(BlockedError("challenge")), "https://example.test/a")
    assert transient.available is None
    assert blocked.available is None


@pytest.mark.asyncio
async def test_active_and_marker_checks():
    active = await check_source(FakeFetcher("<html><body>Oferta dostępna</body></html>"), "https://example.test/a")
    gone = await check_source(FakeFetcher("<html><body>Listing has expired</body></html>"), "https://example.test/a")
    assert active.available is True
    assert gone.available is False
