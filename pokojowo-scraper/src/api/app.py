"""FastAPI application for Scraper Dashboard API."""

from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from src.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    try:
        app.state.mongodb_client = AsyncIOMotorClient(
            settings.scraper_mongodb_url,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
        )
        app.state.db = app.state.mongodb_client[settings.scraper_database_name]

        # Test connection and ensure indexes
        await app.state.db.command("ping")
        print("Connected to MongoDB successfully")

        await app.state.db.scrape_jobs.create_index("job_id", unique=True)
        await app.state.db.scraped_listings.create_index("dedup_hash", unique=True)
        await app.state.db.pending_approvals.create_index("created_at")
        await app.state.db.pending_approvals.create_index("status")
        print("Database indexes created")

    except Exception as e:
        print(f"Warning: MongoDB connection failed: {e}")
        print("API will start but database features will not work")
        app.state.mongodb_client = None
        app.state.db = None

    yield

    # Shutdown
    if app.state.mongodb_client:
        app.state.mongodb_client.close()


app = FastAPI(
    title="Pokojowo Scraper Dashboard API",
    description="API for managing scraper jobs, approving listings, and monitoring data quality",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Import and include routers
from .routes import jobs, pending_listings, stats, approval

app.include_router(jobs.router, prefix="/api/scraper/jobs", tags=["Jobs"])
app.include_router(pending_listings.router, prefix="/api/scraper/pending", tags=["Pending Approvals"])
app.include_router(stats.router, prefix="/api/scraper/stats", tags=["Statistics"])
app.include_router(approval.router, prefix="/api/scraper/approval", tags=["Approval Actions"])


@app.get("/api/scraper/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "pokojowo-scraper-api"}
