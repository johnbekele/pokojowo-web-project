"""Privacy-safe error tracking for the FastAPI service.

Sentry is deliberately disabled when ``SENTRY_DSN`` is empty. This keeps
local development and CI deterministic while allowing the same image to be
promoted to production with only environment configuration.
"""

from __future__ import annotations

import re
from typing import Any, Mapping


REDACTED = "[Filtered]"

_SENSITIVE_KEY = re.compile(
    r"(?:authorization|cookie|set-cookie|x-api-key|api[-_]?key|"
    r"access[-_]?token|refresh[-_]?token|id[-_]?token|token|password|"
    r"passwd|secret|credential|email|phone|mobile|telephone)",
    re.IGNORECASE,
)
_BODY_KEY = re.compile(r"^(?:body|request[_-]?body|form|payload|data)$", re.IGNORECASE)
_EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_PHONE = re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)")
_JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b")


def _scrub_string(value: str) -> str:
    """Remove common PII and bearer/JWT values from arbitrary text."""

    value = _EMAIL.sub(REDACTED, value)
    value = _PHONE.sub(REDACTED, value)
    value = _JWT.sub(REDACTED, value)
    # Query strings and log messages often contain these even when the key is
    # not represented as a mapping key.
    value = re.sub(
        r"(?i)(authorization|access[_-]?token|refresh[_-]?token|password|secret)"
        r"\s*[:=]\s*[^\s&,;]+",
        lambda match: f"{match.group(1)}={REDACTED}",
        value,
    )
    return value


def scrub_event(value: Any, key: str | None = None) -> Any:
    """Return a recursively scrubbed Sentry event/value.

    Request bodies are removed as a whole. Other values are filtered by key
    and by content so that auth data is still protected when a framework puts
    it in ``extra``, a breadcrumb, a URL, or an exception message.
    """

    if key and (_SENSITIVE_KEY.search(key) or _BODY_KEY.fullmatch(key)):
        return REDACTED
    if isinstance(value, str):
        return _scrub_string(value)
    if isinstance(value, Mapping):
        return {str(child_key): scrub_event(child_value, str(child_key)) for child_key, child_value in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [scrub_event(item) for item in value]
    return value


def _environment(settings: Any) -> str:
    return settings.SENTRY_ENVIRONMENT or ("development" if settings.DEBUG else "production")


def _release(settings: Any) -> str:
    return settings.SENTRY_RELEASE or f"pokojowo-api@{settings.APP_VERSION}"


def init_sentry(settings: Any) -> bool:
    """Initialise Sentry when configured and return whether it was enabled."""

    dsn = (settings.SENTRY_DSN or "").strip()
    if not dsn:
        return False

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=_environment(settings),
        release=_release(settings),
        integrations=[FastApiIntegration(), StarletteIntegration()],
        send_default_pii=False,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        before_send=lambda event, hint: scrub_event(event),
    )
    return True
