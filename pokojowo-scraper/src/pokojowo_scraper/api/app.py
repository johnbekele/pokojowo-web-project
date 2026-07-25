"""Dashboard API (port 8001). Serves the admin React app's data needs:
runs history, approval queue with edit-before-approve, annotations,
precision metrics, live SSE logs, and manual run triggering."""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

from bson import ObjectId
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from pokojowo_scraper.api import logs as log_bus
from pokojowo_scraper.store import db, ensure_indexes, utcnow

logger = logging.getLogger(__name__)

app = FastAPI(title="Pokojowo Scraper Dashboard API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_active_run: asyncio.Task | None = None


@app.on_event("startup")
async def startup() -> None:
    log_bus.install()
    await ensure_indexes()


@app.get("/api/scraper/health")
async def health() -> dict:
    return {"status": "ok", "version": "2.0.0", "run_active": bool(_active_run and not _active_run.done())}


# ---- runs -------------------------------------------------------------------

@app.get("/api/scraper/runs")
async def list_runs(limit: int = Query(30, le=200), skip: int = 0) -> list[dict]:
    cursor = db().runs.find({}, {"_id": 0}).sort("started_at", -1).skip(skip).limit(limit)
    return [r async for r in cursor]


@app.post("/api/scraper/runs", status_code=202)
async def trigger_run(site: Optional[str] = None, city: Optional[str] = None) -> dict:
    """Manual run trigger. One run at a time."""
    global _active_run
    if _active_run and not _active_run.done():
        raise HTTPException(409, "a run is already active")
    from pokojowo_scraper.pipeline import run_all

    _active_run = asyncio.create_task(run_all(site=site, city=city, trigger="dashboard"))
    return {"message": "run started"}


@app.get("/api/scraper/logs/stream")
async def stream_logs():
    """SSE: replay recent history, then follow live pipeline logs."""
    async def gen():
        q = log_bus.subscribe()
        try:
            for entry in list(log_bus.history)[-200:]:
                yield {"data": json.dumps(entry)}
            while True:
                entry = await q.get()
                yield {"data": json.dumps(entry)}
        finally:
            log_bus.unsubscribe(q)

    return EventSourceResponse(gen())


# ---- approval queue -----------------------------------------------------------

QueueStatus = Literal["pending", "held", "published", "rejected", "duplicate"]


@app.get("/api/scraper/queue")
async def list_queue(
    status: QueueStatus = "pending",
    limit: int = Query(20, le=100),
    skip: int = 0,
) -> dict:
    filt = {"status": status}
    total = await db().pending.count_documents(filt)
    cursor = db().pending.find(filt).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@app.get("/api/scraper/queue/stats")
async def queue_stats() -> dict:
    pipeline = [{"$group": {"_id": "$status", "n": {"$sum": 1}}}]
    counts = {row["_id"]: row["n"] async for row in db().pending.aggregate(pipeline)}
    return {"counts": counts}


class ListingEdit(BaseModel):
    """Fields the reviewer may correct before approving. Keys mirror the
    FieldValue names; values are plain — they're stored as manual source."""
    edits: dict[str, Any]


@app.put("/api/scraper/queue/{item_id}")
async def edit_queue_item(item_id: str, body: ListingEdit) -> dict:
    doc = await _get_item(item_id)
    updates = {}
    for field, value in body.edits.items():
        if field == "description_en":
            updates["listing.description_en"] = {
                "value": value, "source": "manual", "confidence": 1.0
            }
            updates["listing.translation_suspect"] = False
        elif field in ("coordinates",):
            updates["listing.coordinates"] = {
                "value": value, "source": "manual", "confidence": 1.0
            }
            updates["listing.geo_precision"] = "exact"
        else:
            updates[f"listing.{field}"] = {
                "value": value, "source": "manual", "confidence": 1.0
            }
    await db().pending.update_one(
        {"_id": doc["_id"]},
        {"$set": {**updates, "edited_at": utcnow()}},
    )
    return {"message": "updated", "fields": list(body.edits)}


class ApprovalAction(BaseModel):
    action: Literal["approve", "reject"]
    reason: Optional[str] = None  # reject reason — doubles as an annotation


@app.post("/api/scraper/queue/{item_id}/decision")
async def decide(item_id: str, body: ApprovalAction) -> dict:
    doc = await _get_item(item_id)
    if doc["status"] not in ("pending", "held"):
        raise HTTPException(409, f"item is {doc['status']}, not reviewable")

    if body.action == "reject":
        await db().pending.update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": "rejected", "reviewed_at": utcnow(),
                      "reject_reason": body.reason}},
        )
        if body.reason:
            await db().annotations.insert_one({
                "listing_id": str(doc["_id"]),
                "source_site": doc["source_site"],
                "field": "_listing",
                "issue": "rejected",
                "comment": body.reason,
                "created_at": utcnow(),
            })
        return {"message": "rejected"}

    # approve → publish now
    from pokojowo_scraper.publish import PublishError, publish
    from pokojowo_scraper.schemas import ExtractedListing

    listing = ExtractedListing.model_validate(doc["listing"])
    try:
        result = await publish(listing)
    except PublishError as e:
        raise HTTPException(502, f"publish failed: {e}")
    await db().pending.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "published", "reviewed_at": utcnow(),
                  "published_at": utcnow(),
                  "pokojowo_listing_id": result.get("listing_id")}},
    )
    return {"message": "published", "listing_id": result.get("listing_id"),
            "duplicate": result.get("duplicate", False)}


# ---- annotations (precision ground truth) -------------------------------------

ISSUE_TAGS = [
    "wrong-district", "bad-translation", "wrong-price", "wrong-size",
    "wrong-location", "spam", "duplicate", "other",
]


class Annotation(BaseModel):
    field: str            # which listing field the issue concerns, or "_listing"
    issue: str            # one of ISSUE_TAGS
    comment: Optional[str] = None
    corrected_value: Optional[Any] = None


@app.post("/api/scraper/queue/{item_id}/annotate")
async def annotate(item_id: str, body: Annotation) -> dict:
    if body.issue not in ISSUE_TAGS:
        raise HTTPException(422, f"issue must be one of {ISSUE_TAGS}")
    doc = await _get_item(item_id)
    await db().annotations.insert_one({
        "listing_id": str(doc["_id"]),
        "source_site": doc["source_site"],
        "field": body.field,
        "issue": body.issue,
        "comment": body.comment,
        "corrected_value": body.corrected_value,
        "created_at": utcnow(),
    })
    return {"message": "annotated"}


@app.get("/api/scraper/annotations")
async def list_annotations(limit: int = Query(50, le=200), skip: int = 0) -> list[dict]:
    cursor = db().annotations.find({}).sort("created_at", -1).skip(skip).limit(limit)
    out = []
    async for a in cursor:
        a["_id"] = str(a["_id"])
        out.append(a)
    return out


# ---- metrics -------------------------------------------------------------------

@app.get("/api/scraper/metrics/precision")
async def precision_metrics(days: int = Query(30, le=365)) -> dict:
    """Per site × field: reviewed count vs issue-tagged count.
    precision = 1 - issues/reviewed (only meaningful once items are reviewed)."""
    since = utcnow() - timedelta(days=days)

    reviewed = {}
    async for row in db().pending.aggregate([
        {"$match": {"reviewed_at": {"$gte": since}}},
        {"$group": {"_id": "$source_site", "n": {"$sum": 1}}},
    ]):
        reviewed[row["_id"]] = row["n"]

    issues = {}
    async for row in db().annotations.aggregate([
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {"_id": {"site": "$source_site", "field": "$field",
                            "issue": "$issue"}, "n": {"$sum": 1}}},
    ]):
        k = row["_id"]
        issues.setdefault(k["site"], []).append(
            {"field": k["field"], "issue": k["issue"], "count": row["n"]}
        )

    return {"since": since.isoformat(), "reviewed_by_site": reviewed,
            "issues_by_site": issues}


@app.get("/api/scraper/metrics/quality")
async def quality_metrics(days: int = Query(30, le=365)) -> dict:
    """Quality-score distribution + routing outcomes per site."""
    since = utcnow() - timedelta(days=days)
    out = {}
    async for row in db().pending.aggregate([
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": {"site": "$source_site", "status": "$status"},
            "n": {"$sum": 1},
            "avg_confidence": {"$avg": "$quality.confidence"},
            "avg_completeness": {"$avg": "$quality.completeness"},
        }},
    ]):
        site = row["_id"]["site"]
        out.setdefault(site, {})[row["_id"]["status"]] = {
            "count": row["n"],
            "avg_confidence": round(row["avg_confidence"] or 0, 3),
            "avg_completeness": round(row["avg_completeness"] or 0, 3),
        }
    return {"since": since.isoformat(), "by_site": out}


# ---- helpers --------------------------------------------------------------------

async def _get_item(item_id: str) -> dict:
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(400, "invalid id")
    doc = await db().pending.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "not found")
    return doc
