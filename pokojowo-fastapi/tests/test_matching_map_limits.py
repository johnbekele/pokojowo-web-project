"""The matching map must advertise and enforce its server-side pin cap."""

import asyncio
from types import SimpleNamespace

from app.api.v1.endpoints import matching


def test_matching_map_reports_truncation_when_pin_limit_is_reached(monkeypatch):
    matches = [
        {
            "user_id": f"user-{index}",
            "compatibility_score": 100 - index,
            "living_profile": {"preferred_location_geo": {"coordinates": [21, 52]}},
        }
        for index in range(4)
    ]

    async def scored_matches(_user):
        return {"matches": matches}

    monkeypatch.setattr(matching, "get_scored_matches", scored_matches)
    monkeypatch.setattr(matching, "parse_bbox", lambda _bbox: object())
    monkeypatch.setattr(matching, "coords_from_geo", lambda _geo: (21, 52))
    monkeypatch.setattr(matching, "point_in_bbox", lambda _box, _lng, _lat: True)
    monkeypatch.setattr(matching, "scatter_point", lambda lng, lat, seed: (lng, lat))

    user = SimpleNamespace(
        is_profile_complete=True,
        has_role=lambda _role: True,
    )
    response = asyncio.run(
        matching.get_matches_map(
            bbox="20,51,22,53",
            min_score=0,
            limit=2,
            current_user=user,
        )
    )

    assert len(response["pins"]) == 2
    assert response["total"] == 2
    assert response["truncated"] is True
    assert response["totalWithArea"] == 4
