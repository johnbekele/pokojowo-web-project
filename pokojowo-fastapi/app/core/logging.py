"""Structured, request-correlated logging for the API service."""

from datetime import datetime, timezone
import json
import logging
import re

from app.core.request_context import get_request_id


_SENSITIVE_VALUE = re.compile(
    r"(?i)(access[_-]?token|refresh[_-]?token|password|authorization|"
    r"verification[_-]?code|otp|message|content)\s*[:=]\s*(\"[^\"]*\"|'[^']*'|[^,\s}]+)"
)


def _safe_message(message: str) -> str:
    return _SENSITIVE_VALUE.sub(r"\1=<redacted>", message)


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": _safe_message(record.getMessage()),
            "request_id": getattr(record, "request_id", get_request_id()),
        }
        for field in ("http_method", "path", "status_code"):
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        if record.exc_info:
            payload["exception"] = _safe_message(self.formatException(record.exc_info))
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(debug: bool) -> None:
    """Emit application logs as JSON while keeping dependency noise quiet."""

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestContextFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.DEBUG if debug else logging.INFO)

    for logger_name in ("engineio", "socketio", "uvicorn.access", "httpx", "httpcore"):
        logging.getLogger(logger_name).setLevel(logging.WARNING)
