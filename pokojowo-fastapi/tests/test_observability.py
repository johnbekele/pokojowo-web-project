from types import SimpleNamespace

from app.core.observability import scrub_event, init_sentry


def test_scrub_event_removes_credentials_pii_and_request_body():
    event = {
        "request": {
            "headers": {"Authorization": "Bearer top-secret", "X-Request-ID": "safe"},
            "data": {"email": "person@example.com", "password": "hunter2"},
            "url": "https://api.example.test/login?phone=+48 555 123 456",
        },
        "exception": {"values": [{"value": "failed for person@example.com"}]},
    }

    scrubbed = scrub_event(event)

    assert scrubbed["request"]["headers"]["Authorization"] == "[Filtered]"
    assert scrubbed["request"]["headers"]["X-Request-ID"] == "safe"
    assert scrubbed["request"]["data"] == "[Filtered]"
    assert "person@example.com" not in str(scrubbed)
    assert "555 123 456" not in str(scrubbed)
    assert "top-secret" not in str(scrubbed)


def test_init_sentry_is_a_noop_without_dsn():
    settings = SimpleNamespace(SENTRY_DSN=None, DEBUG=True)

    assert init_sentry(settings) is False


def test_init_sentry_passes_environment_release_and_scrubber(monkeypatch):
    import sentry_sdk

    captured = {}
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: captured.update(kwargs))
    settings = SimpleNamespace(
        SENTRY_DSN="https://public@example.ingest.sentry.io/1",
        SENTRY_ENVIRONMENT="production",
        SENTRY_RELEASE="pokojowo-api@abc123",
        SENTRY_TRACES_SAMPLE_RATE=0.05,
        DEBUG=False,
        APP_VERSION="1.0.0",
    )

    assert init_sentry(settings) is True
    assert captured["environment"] == "production"
    assert captured["release"] == "pokojowo-api@abc123"
    assert captured["send_default_pii"] is False
    assert captured["traces_sample_rate"] == 0.05
    assert captured["before_send"]({"request": {"data": {"password": "secret"}}}, {})["request"]["data"] == "[Filtered]"
