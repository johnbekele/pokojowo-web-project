"""Regression tests for MatchingService scoring.

Bug-pinning tests are marked xfail(strict=True) so they fail loudly the
moment the corresponding fix lands, at which point the marker is removed.
"""
import pytest

from tests.conftest import make_user


# ---------------------------------------------------------------------------
# Known bug 1: language weight appended unconditionally in _score_preferences
# ---------------------------------------------------------------------------

def test_preferences_age_only_match_scores_100(service):
    """A candidate inside the user's age range, with no other preference
    data on either side, should score 100 on the preferences component."""
    user = make_user(age_range=[20, 30])
    candidate = make_user(age=25)

    score, _ = service._score_preferences(user, candidate)
    assert score == pytest.approx(100.0)


def test_preferences_shared_language_scores(service):
    """Shared languages path appends score and weight together — sanity."""
    user = make_user(languages=["English", "Polish"])
    candidate = make_user(languages=["Polish"])

    score, _ = service._score_preferences(user, candidate)
    # Only the language component fires: 60 + 1*20 = 80
    assert score == pytest.approx(80.0)


# ---------------------------------------------------------------------------
# Known bug 2: _score_schedule crashes when exactly one routine is None
# ---------------------------------------------------------------------------

def test_schedule_one_sided_routine_does_not_crash(service):
    user = make_user(wake_up="07:00", sleep_time="23:00")
    candidate = make_user()  # no routine at all

    score, _ = service._score_schedule(user, candidate)
    assert 0 <= score <= 100


def test_schedule_both_missing_is_neutral(service):
    score, _ = service._score_schedule(make_user(), make_user())
    assert score == pytest.approx(65.0)


def test_schedule_identical_routines_score_high(service):
    a = make_user(wake_up="07:00", sleep_time="23:00")
    b = make_user(wake_up="07:00", sleep_time="23:00")
    score, _ = service._score_schedule(a, b)
    assert score == pytest.approx(100.0)


# ---------------------------------------------------------------------------
# Known bug 3: sparse profiles inflated by tolerant-nonsmoker defaults
# ---------------------------------------------------------------------------

@pytest.mark.xfail(
    strict=True,
    reason="BUG: missing lifestyle data defaults to tolerant non-smoker "
    "scoring 100 on smoking/pets (issue #33)",
)
def test_smoking_unknown_data_is_neutral(service):
    """Two users with no lifestyle data should get a neutral smoking score,
    not a perfect one."""
    score, _ = service._score_smoking_compatibility(None, None)
    assert score < 100


@pytest.mark.xfail(
    strict=True,
    reason="BUG: empty-vs-empty profiles land in 'good' tier (~59.7) via "
    "permissive defaults; should be 'fair' (issue #33)",
)
def test_empty_profiles_score_fair_not_good(service):
    empty_a = make_user()
    empty_b = make_user()

    score, _breakdown, _expl = service._calculate_compatibility(empty_a, empty_b)
    assert score < 55  # "fair" ceiling


# ---------------------------------------------------------------------------
# Known bug 4: region map covers only 6 of 16 voivodeships
# ---------------------------------------------------------------------------

def test_lodz_region_recognized(service):
    # callers pass lowercased strings
    assert service._locations_in_same_region("łódź", "piotrków trybunalski")


def test_warsaw_region_recognized(service):
    assert service._locations_in_same_region("warsaw", "radom")


def test_different_regions_not_matched(service):
    assert not service._locations_in_same_region("warsaw", "kraków")


# ---------------------------------------------------------------------------
# Happy-path pins for pure helpers
# ---------------------------------------------------------------------------

def test_range_overlap_full_containment(service):
    overlap = service._calculate_range_overlap(1000, 3000, 1500, 2500)
    assert overlap == pytest.approx(1.0)


def test_range_overlap_disjoint(service):
    overlap = service._calculate_range_overlap(1000, 1500, 2000, 3000)
    assert overlap == pytest.approx(0.0)


def test_range_overlap_partial(service):
    # [1000,2000] vs [1500,2500]: overlap 500, smaller range 1000 -> 0.5
    overlap = service._calculate_range_overlap(1000, 2000, 1500, 2500)
    assert overlap == pytest.approx(0.5)


def test_enum_distance_same_value(service):
    from app.models.user import CleanlinessEnum

    order = list(CleanlinessEnum)
    score = service._score_enum_distance(CleanlinessEnum.CLEAN, CleanlinessEnum.CLEAN, order)
    assert score == pytest.approx(100.0)


def test_enum_distance_adjacent_value(service):
    from app.models.user import CleanlinessEnum

    order = list(CleanlinessEnum)
    score = service._score_enum_distance(CleanlinessEnum.VERY_CLEAN, CleanlinessEnum.CLEAN, order)
    assert score == pytest.approx(80.0)


def test_enum_distance_missing_is_neutral(service):
    from app.models.user import CleanlinessEnum

    order = list(CleanlinessEnum)
    score = service._score_enum_distance(None, CleanlinessEnum.CLEAN, order)
    assert score == pytest.approx(50.0)


def test_time_difference_simple(service):
    assert service._time_difference_hours("07:00", "09:00") == pytest.approx(2.0)


def test_time_difference_midnight_wrap(service):
    # 23:00 vs 01:00 should be 2 hours apart, not 22
    assert service._time_difference_hours("23:00", "01:00") == pytest.approx(2.0)


# ---------------------------------------------------------------------------
# Deal-breaker behavior pins (current correct behavior — keep green)
# ---------------------------------------------------------------------------

def test_deal_breaker_no_smokers_rejects_smoker(service):
    from app.models.user import DealBreakersModel

    user = make_user(deal_breakers=DealBreakersModel(no_smokers=True))
    smoker = make_user(smokes=True)

    assert service._check_deal_breakers(user, smoker) is not None


def test_deal_breaker_no_children_rejects_parent(service):
    from app.models.user import DealBreakersModel

    user = make_user(deal_breakers=DealBreakersModel(no_children=True))
    parent = make_user(has_children=True)

    assert service._check_deal_breakers(user, parent) is not None


def test_no_deal_breakers_passes(service):
    assert service._check_deal_breakers(make_user(), make_user()) is None
