"""The run pipeline: harvest → fetch → extract → enrich → score → route.

Incremental by design: pagination stops after `stop_after_seen` consecutive
known URLs (search results are newest-first), so steady-state scheduled runs
touch only a handful of pages.
"""

import logging
import uuid

from pokojowo_scraper.config import settings
from pokojowo_scraper.dedupe import content_hash, find_cross_site_duplicate, image_phashes
from pokojowo_scraper.enrich.geocode import geocode
from pokojowo_scraper.enrich.llm import llm_fill_gaps
from pokojowo_scraper.enrich.poi import enrich_close_to
from pokojowo_scraper.enrich.rules import apply_rules
from pokojowo_scraper.enrich.translate import translate_pl_to_en
from pokojowo_scraper.fetch.client import BlockedError, Fetcher
from pokojowo_scraper.publish import PublishError, publish, update_source_status
from pokojowo_scraper.quality import score
from pokojowo_scraper.revalidation import check_source
from pokojowo_scraper.schemas import ExtractedListing, RouteDecision, RunStats, fv
from pokojowo_scraper.sites import ADAPTERS
from pokojowo_scraper.store import (
    archive_stale,
    db,
    ensure_indexes,
    is_seen,
    mark_seen,
    published_scraped_sources,
    record_price_change,
    record_source_check,
    utcnow,
)

logger = logging.getLogger(__name__)


async def run_all(
    site: str | None = None,
    city: str | None = None,
    pages: int | None = None,
    dry_run: bool = False,
    trigger: str = "manual",
) -> dict:
    """Run every (site, city) combination and record a runs document."""
    await ensure_indexes()
    run_id = f"run-{uuid.uuid4().hex[:10]}"
    sites = [site] if site else list(ADAPTERS)
    cities = [city] if city else settings.cities
    page_cap = pages or settings.page_cap

    run_doc = {
        "run_id": run_id,
        "trigger": trigger,
        "dry_run": dry_run,
        "started_at": utcnow(),
        "finished_at": None,
        "per_site": {},
    }
    if not dry_run:
        await db().runs.insert_one(run_doc)

    for s in sites:
        stats = RunStats()
        try:
            async with Fetcher() as fetcher:
                for c in cities:
                    try:
                        await run_site_city(s, c, page_cap, fetcher, run_id, stats, dry_run)
                    except ValueError as e:  # city not supported by this site
                        logger.warning("skipping %s/%s: %s", s, c, e)
                    except BlockedError as e:
                        logger.error("%s blocked: %s", s, e)
                        stats.blocked = True
                        break  # stop this site for the whole run
                if not dry_run:
                    await revalidate_published(
                        fetcher, run_id, source_site=s, stats=stats
                    )
                stats.fetch_attempts = fetcher.fetch_attempts
                stats.fetch_retries = fetcher.fetch_retries
                stats.fetch_successes = fetcher.fetch_successes
        except Exception:
            logger.exception("site %s failed", s)
            stats.errors += 1
        run_doc["per_site"][s] = stats.model_dump()
        if not dry_run:
            await db().runs.update_one(
                {"run_id": run_id}, {"$set": {f"per_site.{s}": stats.model_dump()}}
            )

    if not dry_run:
        maintenance = await archive_stale()
        await db().runs.update_one(
            {"run_id": run_id},
            {"$set": {"finished_at": utcnow(), "maintenance": maintenance}},
        )
    logger.info("run %s finished: %s", run_id, run_doc["per_site"])
    return run_doc


async def run_site_city(
    site: str,
    city: str,
    page_cap: int,
    fetcher: Fetcher,
    run_id: str,
    stats: RunStats,
    dry_run: bool,
) -> None:
    adapter = ADAPTERS[site]
    consecutive_seen = 0

    for page in range(1, page_cap + 1):
        search_html = await fetcher.get(adapter.search_url(city, page))
        stats.pages_fetched += 1
        urls = adapter.listing_urls(search_html)
        if not urls:
            break

        for url in urls:
            seen = await is_seen(url)
            if seen:
                consecutive_seen += 1
                stats.skipped_seen += 1
                if consecutive_seen >= settings.stop_after_seen:
                    logger.info("%s/%s: %d consecutive seen — stopping",
                                site, city, consecutive_seen)
                    _log_extraction_alert(site, city, stats)
                    return
                continue
            consecutive_seen = 0

            try:
                await process_listing(url, adapter, fetcher, run_id, stats, dry_run)
            except BlockedError:
                raise
            except Exception:
                logger.exception("failed to process %s", url)
                stats.errors += 1

    _log_extraction_alert(site, city, stats)


def _log_extraction_alert(site: str, city: str, stats: RunStats) -> None:
    if (
        stats.details_fetched >= settings.extraction_alert_min_samples
        and stats.records_extracted / stats.details_fetched < settings.extraction_alert_threshold
    ):
        logger.error(
            "extraction success rate alert for %s/%s: %d/%d (%.1f%%)",
            site,
            city,
            stats.records_extracted,
            stats.details_fetched,
            100 * stats.records_extracted / stats.details_fetched,
        )


async def process_listing(
    url, adapter, fetcher: Fetcher, run_id: str, stats: RunStats, dry_run: bool
) -> RouteDecision | None:
    html = await fetcher.get(url)
    stats.details_fetched += 1

    listing = adapter.extract(url, html)
    if listing is None:
        stats.errors += 1
        return None
    stats.records_extracted += 1

    listing = apply_rules(listing)
    listing = await geocode(listing)
    listing = await enrich_close_to(listing)
    listing = await llm_fill_gaps(listing)

    if listing.description_pl:
        result = await translate_pl_to_en(listing.description_pl.value)
        if result:
            listing.description_en = fv(result.text, "llm")
            listing.translation_suspect = result.suspect

    q = score(listing)
    if q.confidence >= settings.queue_threshold and not q.gates_failed:
        stats.records_quality_passed += 1
    decision = await route(listing, q, run_id, stats, dry_run)
    logger.info("%s -> %s (conf %.2f, gates %s)",
                url, decision, q.confidence, q.gates_failed or "ok")
    stats.new += 1
    return decision


async def revalidate_published(
    fetcher: Fetcher,
    run_id: str,
    *,
    source_site: str,
    stats: RunStats | None = None,
) -> dict[str, int]:
    """Recheck imported sources and unpublish only after two failures."""
    checked = unpublished = 0
    docs = await published_scraped_sources(source_site, settings.revalidation_limit)
    for doc in docs:
        source_url = doc.get("source_url")
        if not source_url:
            continue
        check = await check_source(fetcher, source_url)
        if check.available is None:
            logger.info("source revalidation deferred for %s (%s)", source_url, check.reason)
            continue

        verification = await record_source_check(
            source_url, run_id, available=check.available
        )
        failures = verification["consecutive_failures"]
        try:
            result = await update_source_status(
                source_url,
                available=check.available,
                checked_at=verification["checked_at"],
                consecutive_failures=failures,
                reason=check.reason,
            )
        except PublishError as exc:
            logger.warning("source revalidation update failed for %s: %s", source_url, exc)
            continue

        checked += 1
        if result.get("unpublished"):
            unpublished += 1
            logger.warning("unpublished stale scraped listing %s", source_url)

    if stats:
        stats.sources_checked += checked
        stats.sources_unpublished += unpublished
    return {"checked": checked, "unpublished": unpublished}


async def route(
    listing: ExtractedListing, q, run_id: str, stats: RunStats, dry_run: bool
) -> RouteDecision:
    """Auto-publish / queue / hold, with dedup checks first."""
    chash = content_hash(listing)

    prior = await is_seen(listing.source_url)
    if prior and prior.get("content_hash") == chash:
        stats.skipped_seen += 1
        return "duplicate"
    if prior and listing.price and prior.get("price") not in (None, listing.price.value):
        if not dry_run:
            await record_price_change(
                listing.source_url, prior["price"], listing.price.value
            )
        stats.updated += 1

    phashes = await image_phashes(listing.images.value if listing.images else [])
    dup_url = await find_cross_site_duplicate(listing, phashes)

    if dry_run:
        return "duplicate" if dup_url else _decision_for(q)

    decision: RouteDecision
    if dup_url:
        decision = "duplicate"
        stats.duplicates += 1
    else:
        decision = _decision_for(q)

    doc = {
        "source_url": listing.source_url,
        "source_site": listing.source_site,
        "run_id": run_id,
        "status": {"published": "published", "queued": "pending",
                   "held": "held", "duplicate": "duplicate"}[decision],
        "listing": listing.model_dump(mode="json"),
        "quality": q.model_dump(),
        "phashes": phashes,
        "duplicate_of": dup_url,
        "created_at": utcnow(),
    }

    if decision == "published":
        try:
            result = await publish(listing)
            doc["pokojowo_listing_id"] = result.get("listing_id")
            doc["published_at"] = utcnow()
            stats.published += 1
        except Exception as e:
            logger.warning("auto-publish failed, queueing: %s", e)
            doc["status"] = "pending"
            doc["publish_error"] = str(e)
            decision = "queued"
            stats.queued += 1
    elif decision == "queued":
        stats.queued += 1
    elif decision == "held":
        stats.held += 1

    await db().pending.update_one(
        {"source_url": listing.source_url}, {"$set": doc}, upsert=True
    )
    await mark_seen(listing.source_url, run_id, chash,
                    listing.price.value if listing.price else None)
    return decision


def _decision_for(q) -> RouteDecision:
    if q.confidence >= settings.auto_publish_threshold and not q.gates_failed:
        return "published"
    if q.confidence >= settings.queue_threshold:
        return "queued"
    return "held"
