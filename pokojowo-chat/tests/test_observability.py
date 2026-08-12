from types import SimpleNamespace

from app.core.observability import init_sentry, scrub_event


def test_scrub_event_removes_auth_pii_and_body():
    event = {
        "request": {
            "headers": {"authorization": "Bearer top-secret"},
            "data": {"phone": "+48 555 123 456", "email": "person@example.com"},
        },
        "message": "chat failed for person@example.com",
    }

    scrubbed = scrub_event(event)

    assert scrubbed["request"]["headers"]["authorization"] == "[Filtered]"
    assert scrubbed["request"]["data"] == "[Filtered]"
    assert "person@example.com" not in str(scrubbed)
    assert "555 123 456" not in str(scrubbed)
    assert "top-secret" not in str(scrubbed)


def test_init_sentry_is_a_noop_without_dsn():
    assert init_sentry(SimpleNamespace(SENTRY_DSN=None, DEBUG=True)) is False
