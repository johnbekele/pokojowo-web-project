"""Privacy-safe Sentry setup for the chat FastAPI service.

The module intentionally mirrors the main API's small, dependency-free
configuration surface because the services are built and deployed separately.
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
    value = _EMAIL.sub(REDACTED, value)
    value = _PHONE.sub(REDACTED, value)
    value = _JWT.sub(REDACTED, value)
    return re.sub(
        r"(?i)(authorization|access[_-]?token|refresh[_-]?token|password|secret)"
        r"\s*[:=]\s*[^\s&,;]+",
        lambda match: f"{match.group(1)}={REDACTED}",
        value,
    )


def scrub_event(value: Any, key: str | None = None) -> Any:
    """Recursively remove PII, credentials, and complete request bodies."""

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
    return settings.SENTRY_RELEASE or f"pokojowo-chat@{settings.APP_VERSION}"


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
