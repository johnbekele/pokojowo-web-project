from pokojowo_scraper.pipeline import _decision_for
from pokojowo_scraper.schemas import QualityScore


def q(conf: float, gates: list[str] | None = None) -> QualityScore:
    return QualityScore(completeness=conf, confidence=conf, gates_failed=gates or [])


def test_high_score_clean_gates_publishes():
    assert _decision_for(q(0.9)) == "published"


def test_high_score_failed_gate_queues():
    assert _decision_for(q(0.9, ["geo_imprecise"])) == "queued"


def test_mid_score_queues():
    assert _decision_for(q(0.7)) == "queued"


def test_low_score_held():
    assert _decision_for(q(0.4)) == "held"


def test_thresholds_are_inclusive():
    assert _decision_for(q(0.85)) == "published"
    assert _decision_for(q(0.60)) == "queued"
