"""In-memory log fan-out for SSE: a logging.Handler that pushes pipeline
log records to per-subscriber asyncio queues, plus a bounded history so a
page refresh mid-run doesn't lose earlier lines."""

import asyncio
import logging
from collections import deque
from datetime import datetime, timezone

MAX_HISTORY = 2000

history: deque[dict] = deque(maxlen=MAX_HISTORY)
_subscribers: set[asyncio.Queue] = set()


class SseLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        history.append(entry)
        for q in list(_subscribers):
            try:
                q.put_nowait(entry)
            except asyncio.QueueFull:
                pass


def install() -> None:
    root = logging.getLogger("pokojowo_scraper")
    if not any(isinstance(h, SseLogHandler) for h in root.handlers):
        root.addHandler(SseLogHandler())
        root.setLevel(logging.INFO)


def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=1000)
    _subscribers.add(q)
    return q


def unsubscribe(q: asyncio.Queue) -> None:
    _subscribers.discard(q)
