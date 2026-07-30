"""Unit tests for the map endpoints' geo helpers."""
import math

import pytest
from fastapi import HTTPException

from app.core.geo import (
    CLUSTER_ZOOM_THRESHOLD,
    GeoPrecision,
    SCATTER_RADIUS_METRES,
    bbox_clause,
    cluster_cell_size,
    coords_from_geo,
    parse_bbox,
    point_in_bbox,
    precision_rank,
    scatter_point,
    to_geojson_point,
)

WARSAW = parse_bbox("20.85,52.10,21.27,52.37")


def test_parse_bbox_reads_lng_lat_pairs():
    bbox = parse_bbox("20.85,52.10,21.27,52.37")
    assert (bbox.sw_lng, bbox.sw_lat) == (20.85, 52.10)
    assert (bbox.ne_lng, bbox.ne_lat) == (21.27, 52.37)


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "20.85,52.10,21.27",
        "20.85,52.10,21.27,52.37,1",
        "not,a,bounding,box",
        "20.85,52.10,181,52.37",
        "20.85,-91,21.27,52.37",
        # South above north is a client bug, not a wrap-around
        "20.85,52.37,21.27,52.10",
    ],
)
def test_parse_bbox_rejects_bad_input(raw):
    with pytest.raises(HTTPException) as excinfo:
        parse_bbox(raw)
    assert excinfo.value.status_code == 400


def test_parse_bbox_widens_when_panned_past_the_antimeridian():
    bbox = parse_bbox("170,52.10,-170,52.37")
    assert (bbox.sw_lng, bbox.ne_lng) == (-180.0, 180.0)


def test_bbox_clause_builds_a_closed_ring():
    ring = bbox_clause(WARSAW)["locationGeo"]["$geoWithin"]["$geometry"]["coordinates"][0]
    assert len(ring) == 5
    assert ring[0] == ring[-1]
    assert ring[0] == [WARSAW.sw_lng, WARSAW.sw_lat]


def test_point_in_bbox():
    assert point_in_bbox(WARSAW, 21.01, 52.23)
    assert not point_in_bbox(WARSAW, 19.94, 50.05)


def test_cluster_cell_size_halves_each_zoom_level():
    assert cluster_cell_size(10) == pytest.approx(cluster_cell_size(11) * 2)
    # Clamped, so nonsense zooms can't produce a zero or negative cell
    assert cluster_cell_size(-5) > 0
    assert cluster_cell_size(99) > 0


def test_precision_rank_orders_least_to_most_precise():
    assert precision_rank(None) < precision_rank(GeoPrecision.CITY)
    assert precision_rank("nonsense") < precision_rank(GeoPrecision.CITY)
    assert (
        precision_rank(GeoPrecision.CITY)
        < precision_rank(GeoPrecision.DISTRICT)
        < precision_rank(GeoPrecision.STREET)
        < precision_rank(GeoPrecision.EXACT)
    )


@pytest.mark.parametrize(
    "value",
    [None, {}, {"coordinates": [21.0]}, {"coordinates": "21.0,52.2"}, {"coordinates": [True, False]}],
)
def test_coords_from_geo_rejects_unusable_points(value):
    assert coords_from_geo(value) is None


def test_coords_from_geo_returns_lng_lat():
    assert coords_from_geo(to_geojson_point(52.23, 21.01)) == (21.01, 52.23)


def test_scatter_point_is_deterministic_per_seed():
    first = scatter_point(21.01, 52.23, "user-1")
    assert first == scatter_point(21.01, 52.23, "user-1")
    assert first != scatter_point(21.01, 52.23, "user-2")


def test_scatter_point_stays_inside_the_privacy_radius():
    lng, lat = 21.01, 52.23
    for seed in (f"user-{index}" for index in range(50)):
        moved_lng, moved_lat = scatter_point(lng, lat, seed)
        d_lat = (moved_lat - lat) * 111_320
        d_lng = (moved_lng - lng) * 111_320 * math.cos(math.radians(lat))
        assert math.hypot(d_lat, d_lng) <= SCATTER_RADIUS_METRES + 1


def test_cluster_threshold_is_a_zoom_level():
    assert 0 < CLUSTER_ZOOM_THRESHOLD < 20
