"""Per-process TTL cache for scored match results.

Caches the FULL scored+sorted result of find_matches per user for 5
minutes; endpoint-level filters (limit/min_score) are applied after the
cache lookup so all views share one entry.

Trade-offs (accepted at MVP scale, revisit with Redis if needed):
- per-gunicorn-worker: a refresh on one worker doesn't invalidate
  siblings; 5-min TTL bounds the staleness
- profile edits clear() the whole cache because OTHER users' cached
  lists contain the edited profile
"""
import logging

from cachetools import TTLCache

logger = logging.getLogger(__name__)

_cache: TTLCache = TTLCache(maxsize=2000, ttl=300)

# Debug counters (exposed in logs; used by verification scripts)
stats = {"hits": 0, "misses": 0}


def get(user_id: str):
    result = _cache.get(user_id)
    if result is not None:
        stats["hits"] += 1
        logger.debug("matching cache HIT for %s", user_id)
    else:
        stats["misses"] += 1
    return result


def set(user_id: str, results: dict) -> None:
    _cache[user_id] = results


def invalidate(user_id: str) -> None:
    _cache.pop(user_id, None)


def clear() -> None:
    _cache.clear()
