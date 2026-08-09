import inspect

import pytest
from fastapi import FastAPI
from fastapi.params import Query
from fastapi.testclient import TestClient

from app.api.v1.endpoints import listings, users


def constraint(query: Query, name: str):
    return next(value for value in query.metadata if hasattr(value, name))


def test_listing_endpoints_bound_page_size_and_skip():
    for endpoint in (
        listings.get_listings,
        listings.get_my_listings,
        listings.get_scraped_listings,
        listings.get_listings_by_owner,
    ):
        params = inspect.signature(endpoint).parameters
        assert isinstance(params["limit"].default, Query)
        assert constraint(params["limit"].default, "le").le == listings.MAX_PAGE_SIZE
        assert params["limit"].default.default == 20
        assert isinstance(params["skip"].default, Query)
        assert constraint(params["skip"].default, "le").le == listings.MAX_PAGE_SKIP
        assert params["skip"].default.default == 0


def test_user_endpoint_bound_page_size_and_skip():
    params = inspect.signature(users.get_all_users).parameters
    assert isinstance(params["limit"].default, Query)
    assert constraint(params["limit"].default, "le").le == users.MAX_PAGE_SIZE
    assert params["limit"].default.default == 20
    assert isinstance(params["skip"].default, Query)
    assert constraint(params["skip"].default, "le").le == users.MAX_PAGE_SKIP
    assert params["skip"].default.default == 0


@pytest.mark.parametrize(
    ("path", "query"),
    [
        ("/listings", "limit=101"),
        ("/listings/scraped", "skip=10001"),
        ("/listings/owner/owner-id", "limit=0"),
    ],
)
def test_listing_routes_reject_out_of_range_pagination(path, query):
    app = FastAPI()
    app.include_router(listings.router, prefix="/listings")

    response = TestClient(app).get(f"{path}?{query}")

    assert response.status_code == 422
