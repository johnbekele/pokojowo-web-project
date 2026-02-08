"""Statistics routes for dashboard metrics."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Request, HTTPException

router = APIRouter()


def get_db_or_raise(request: Request):
    """Get database connection or raise 503 if not available."""
    db = request.app.state.db
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not connected. Please check MongoDB configuration."
        )
    return db


@router.get("/overview")
async def get_overview_stats(request: Request):
    """Get overall scraper statistics."""
    db = get_db_or_raise(request)

    # Job statistics
    total_jobs = await db.scrape_jobs.count_documents({})
    running_jobs = await db.scrape_jobs.count_documents({"status": "running"})
    completed_jobs = await db.scrape_jobs.count_documents({"status": "completed"})
    failed_jobs = await db.scrape_jobs.count_documents({"status": "failed"})

    # Listing statistics from pending_approvals (our main collection)
    pending_approval = await db.pending_approvals.count_documents({"status": "pending"})
    approved_count = await db.pending_approvals.count_documents({"status": "approved"})
    rejected_count = await db.pending_approvals.count_documents({"status": "rejected"})
    total_scraped = pending_approval + approved_count + rejected_count

    # Published to Pokojowo
    published_count = await db.pending_approvals.count_documents(
        {"pokojowo_listing_id": {"$ne": None}}
    )

    # Today's stats
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    scraped_today = await db.pending_approvals.count_documents(
        {"created_at": {"$gte": today_start}}
    )
    approved_today = await db.pending_approvals.count_documents(
        {"reviewed_at": {"$gte": today_start}, "status": "approved"}
    )

    return {
        "jobs": {
            "total": total_jobs,
            "running": running_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
        },
        "listings": {
            "total_scraped": total_scraped,
            "pending_approval": pending_approval,
            "approved": approved_count,
            "rejected": rejected_count,
            "published": published_count,
        },
        "today": {
            "scraped": scraped_today,
            "approved": approved_today,
        },
        "approval_rate": round(
            (approved_count / (approved_count + rejected_count) * 100)
            if (approved_count + rejected_count) > 0
            else 0,
            1,
        ),
    }


@router.get("/by-site")
async def get_stats_by_site(request: Request):
    """Get statistics broken down by source site."""
    db = get_db_or_raise(request)

    sites = ["olx", "otodom", "gumtree"]
    result = {}

    for site in sites:
        total = await db.pending_approvals.count_documents({"source_site": site})
        pending = await db.pending_approvals.count_documents(
            {"source_site": site, "status": "pending"}
        )
        approved = await db.pending_approvals.count_documents(
            {"source_site": site, "status": "approved"}
        )
        rejected = await db.pending_approvals.count_documents(
            {"source_site": site, "status": "rejected"}
        )

        result[site] = {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "approval_rate": round(
                (approved / (approved + rejected) * 100)
                if (approved + rejected) > 0
                else 0,
                1,
            ),
        }

    return result


@router.get("/by-city")
async def get_stats_by_city(request: Request):
    """Get statistics broken down by city."""
    db = get_db_or_raise(request)

    pipeline = [
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]

    cities = await db.pending_approvals.aggregate(pipeline).to_list(15)

    return {"cities": [{"city": c["_id"] or "Unknown", "count": c["count"]} for c in cities]}


@router.get("/timeline")
async def get_timeline_stats(request: Request, days: int = 7):
    """Get scraping activity timeline."""
    db = get_db_or_raise(request)

    start_date = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    scraped_timeline = await db.pending_approvals.aggregate(pipeline).to_list(days)

    # Approval timeline
    approval_pipeline = [
        {"$match": {"reviewed_at": {"$gte": start_date}, "status": "approved"}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$reviewed_at"}
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    approved_timeline = await db.pending_approvals.aggregate(approval_pipeline).to_list(days)

    return {
        "scraped": [{"date": d["_id"], "count": d["count"]} for d in scraped_timeline],
        "approved": [{"date": d["_id"], "count": d["count"]} for d in approved_timeline],
    }


@router.get("/quality")
async def get_quality_metrics(request: Request):
    """Get data quality metrics."""
    db = get_db_or_raise(request)

    pipeline = [
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "with_images": {
                    "$sum": {
                        "$cond": [
                            {"$gt": [{"$size": {"$ifNull": ["$images", []]}}, 0]},
                            1,
                            0,
                        ]
                    }
                },
                "with_size": {
                    "$sum": {
                        "$cond": [{"$gt": ["$size", 0]}, 1, 0]
                    }
                },
                "with_price": {
                    "$sum": {
                        "$cond": [{"$gt": ["$price", 0]}, 1, 0]
                    }
                },
                "with_address": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$ne": ["$address", None]},
                                {"$ne": ["$address", ""]}
                            ]},
                            1,
                            0,
                        ]
                    }
                },
                "avg_images": {"$avg": {"$size": {"$ifNull": ["$images", []]}}},
                "avg_completeness": {"$avg": "$data_quality.completeness"},
                "avg_confidence": {"$avg": "$data_quality.confidence"},
            }
        }
    ]

    result = await db.pending_approvals.aggregate(pipeline).to_list(1)

    if not result:
        return {
            "total": 0,
            "completeness": {},
            "averages": {},
        }

    stats = result[0]
    total = stats["total"] or 1

    return {
        "total": stats["total"],
        "completeness": {
            "with_images": round(stats["with_images"] / total * 100, 1),
            "with_size": round(stats["with_size"] / total * 100, 1),
            "with_price": round(stats["with_price"] / total * 100, 1),
            "with_address": round(stats["with_address"] / total * 100, 1),
        },
        "averages": {
            "images_per_listing": round(stats["avg_images"] or 0, 1),
            "completeness_score": round((stats["avg_completeness"] or 0) * 100, 1),
            "confidence_score": round((stats["avg_confidence"] or 0) * 100, 1),
        },
    }


@router.get("/recent-activity")
async def get_recent_activity(request: Request, limit: int = 20):
    """Get recent scraper activity."""
    db = get_db_or_raise(request)

    activities = []

    # Recent jobs
    jobs = await (
        db.scrape_jobs.find()
        .sort("started_at", -1)
        .limit(10)
        .to_list(10)
    )

    for job in jobs:
        job["_id"] = str(job["_id"])
        activities.append({
            "type": "scraped" if job.get("status") == "completed" else job.get("status", "unknown"),
            "timestamp": job.get("completed_at") or job.get("started_at"),
            "site": job.get("site", "unknown"),
            "address": f"{job.get('city', 'Unknown')} - {job.get('listings_found', 0)} listings",
            "job_id": job.get("job_id"),
        })

    # Recent approvals/rejections
    approvals = await (
        db.pending_approvals.find({"status": {"$in": ["approved", "rejected"]}})
        .sort("reviewed_at", -1)
        .limit(10)
        .to_list(10)
    )

    for approval in approvals:
        approval["_id"] = str(approval["_id"])
        activities.append({
            "type": approval.get("status"),
            "timestamp": approval.get("reviewed_at"),
            "site": approval.get("source_site"),
            "address": approval.get("address", "Unknown"),
            "price": approval.get("price"),
            "reviewer": approval.get("reviewed_by"),
            "listing_id": approval["_id"],
        })

    # Recent pending listings
    pending = await (
        db.pending_approvals.find({"status": "pending"})
        .sort("created_at", -1)
        .limit(5)
        .to_list(5)
    )

    for item in pending:
        item["_id"] = str(item["_id"])
        activities.append({
            "type": "pending",
            "timestamp": item.get("created_at"),
            "site": item.get("source_site"),
            "address": item.get("address", "Unknown"),
            "price": item.get("price"),
            "listing_id": item["_id"],
        })

    # Sort by timestamp
    activities.sort(key=lambda x: x.get("timestamp") or datetime.min, reverse=True)

    return {"activities": activities[:limit]}
