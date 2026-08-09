import re

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints.listings import (
    SEARCH_MAX_LENGTH,
    build_listing_query,
    router,
)


def test_search_escapes_regex_metacharacters_in_every_text_field():
    search = "C++ (developer)"

    query = build_listing_query(search=search)

    regexes = [next(iter(condition.values()))["$regex"] for condition in query["$or"]]

    assert regexes == [re.escape(search)] * 4


def test_pathological_search_is_literal_not_a_backtracking_regex():
    search = "(a+)+$"

    query = build_listing_query(search=search)
    pattern = query["$or"][0]["address"]["$regex"]

    assert pattern == re.escape(search)
    assert re.search(pattern, "a a+ a") is None


@pytest.mark.parametrize(
    "path",
    [
        "/listings",
        "/listings/map?bbox=19.8,50.0,20.2,50.2",
    ],
)
def test_listing_search_rejects_terms_over_length_cap(path):
    app = FastAPI()
    app.include_router(router, prefix="/listings")

    separator = "&" if "?" in path else "?"
    response = TestClient(app).get(
        f"{path}{separator}search={'x' * (SEARCH_MAX_LENGTH + 1)}"
    )

    assert response.status_code == 422
