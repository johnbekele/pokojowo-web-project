"""Request-scoped context used by logging and service-to-service calls."""

from contextvars import ContextVar
import re
import uuid
import logging

from starlette.types import ASGIApp, Message, Receive, Scope, Send


REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID = ContextVar("request_id", default="-")
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")
logger = logging.getLogger(__name__)


def get_request_id() -> str:
    return _REQUEST_ID.get()


def set_request_id(request_id: str):
    return _REQUEST_ID.set(request_id)


def reset_request_id(token) -> None:
    _REQUEST_ID.reset(token)


def request_id_from_header(value: str | None) -> str:
    if value and _SAFE_REQUEST_ID.fullmatch(value):
        return value
    return uuid.uuid4().hex


class RequestIdMiddleware:
    """Attach one correlation ID to every HTTP request and response."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        request_id = request_id_from_header(
            headers.get(REQUEST_ID_HEADER.lower().encode(), b"").decode("latin-1") or None
        )
        token = set_request_id(request_id)
        status_code = 500

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                response_headers = list(message.get("headers", []))
                if not any(key.lower() == REQUEST_ID_HEADER.lower().encode() for key, _ in response_headers):
                    response_headers.append((REQUEST_ID_HEADER.lower().encode(), request_id.encode("ascii")))
                message = {**message, "headers": response_headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            logger.info(
                "request completed",
                extra={
                    "http_method": scope.get("method", ""),
                    "path": scope.get("path", ""),
                    "status_code": status_code,
                },
            )
            reset_request_id(token)
