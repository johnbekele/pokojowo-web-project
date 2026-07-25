"""Polish→English translation via local Ollama, with language-detection
validation and a permanent content-hash cache (nothing translated twice)."""

import hashlib
import logging
from dataclasses import dataclass

import httpx
from lingua import Language, LanguageDetectorBuilder

from pokojowo_scraper.config import settings
from pokojowo_scraper.store import db, utcnow

logger = logging.getLogger(__name__)

_detector = None


def _detect(text: str) -> Language | None:
    global _detector
    if _detector is None:
        _detector = LanguageDetectorBuilder.from_languages(
            Language.ENGLISH, Language.POLISH
        ).build()
    return _detector.detect_language_of(text)


PROMPT = (
    "Translate the following Polish rental listing text to natural English. "
    "Translate faithfully — do not summarize, do not add information, "
    "preserve line breaks and numbers exactly. Reply with ONLY the translation.\n\n"
)


@dataclass
class TranslationResult:
    text: str
    suspect: bool  # failed language/length validation
    cached: bool = False


async def translate_pl_to_en(text: str) -> TranslationResult | None:
    """Translate with cache. Returns None only on hard Ollama failure."""
    text = text.strip()
    if not text:
        return None

    text_hash = hashlib.sha256(text.encode()).hexdigest()
    if settings.translation_cache:
        if hit := await db().translations.find_one({"text_hash": text_hash}):
            return TranslationResult(
                text=hit["translated"], suspect=hit.get("suspect", False), cached=True
            )

    translated = await _ollama_translate(text)
    if translated is None:
        return None
    suspect = _is_suspect(text, translated)
    if suspect:
        retry = await _ollama_translate(text)
        if retry is not None and not _is_suspect(text, retry):
            translated, suspect = retry, False

    if settings.translation_cache:
        await db().translations.update_one(
            {"text_hash": text_hash},
            {"$set": {"translated": translated, "suspect": suspect, "created_at": utcnow()}},
            upsert=True,
        )
    return TranslationResult(text=translated, suspect=suspect)


async def _ollama_translate(text: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            resp = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": PROMPT + text,
                    "stream": False,
                    "options": {"temperature": 0},
                },
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip() or None
    except (httpx.HTTPError, KeyError) as e:
        logger.error("ollama translation failed: %s", e)
        return None


def _is_suspect(source: str, translated: str) -> bool:
    if not translated:
        return True
    # length sanity: EN output should be roughly comparable to PL input
    ratio = len(translated) / max(len(source), 1)
    if not 0.5 <= ratio <= 2.0:
        return True
    # only meaningful on non-trivial text
    if len(translated) >= 40 and _detect(translated) != Language.ENGLISH:
        return True
    return False
