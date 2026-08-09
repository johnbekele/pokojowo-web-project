from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import socketio
import logging
from datetime import datetime

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.request_context import RequestIdMiddleware
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1.api import api_router
from app.core.socket import sio

configure_logging(settings.DEBUG)

logger = logging.getLogger(__name__)

# Process start time, captured at import so /health/details can report uptime
_STARTED_AT = datetime.utcnow()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise-level API for Pokojowo - Room Rental Platform (FastAPI)",
    docs_url="/api-docs",
    redoc_url="/api-redoc"
)

# Session middleware (required for OAuth state management)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=3600,  # 1 hour session
)

# CORS Configuration
cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"]
logger.info(f"CORS Origins configured: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
app.add_middleware(RequestIdMiddleware)

# NOTE: /uploads/* is no longer served by FastAPI. Public uploads live in
# S3 (`{bucket}/uploads/...`) and are served by CloudFront's ordered cache
# behavior for `/uploads/*` — see pokojowo-pulumi-infra/__main__.py.

# Include API routers
app.include_router(api_router, prefix=settings.API_V1_STR)


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Pokojowo FastAPI application...")
    await connect_to_mongo()
    logger.info("Application started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Pokojowo FastAPI application...")
    await close_mongo_connection()
    logger.info("Application shutdown complete")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Enterprise-level API for Pokojowo - Room Rental Platform",
        "documentation": "/api-docs",
        "endpoints": {
            "auth": f"{settings.API_V1_STR}/auth",
            "users": f"{settings.API_V1_STR}/users",
            "listings": f"{settings.API_V1_STR}/listings",
            "profile": f"{settings.API_V1_STR}/profile",
            "upload": f"{settings.API_V1_STR}/upload",
            "matching": f"{settings.API_V1_STR}/matching",
            "admin": f"{settings.API_V1_STR}/admin",
        },
    }


# API info endpoint
@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Enterprise-level API for Pokojowo - Room Rental Platform",
        "documentation": "/api-docs",
        "status": "operational"
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/health/details")
async def health_details():
    """Health check with dependency connectivity (no auth).

    Always answers HTTP 200 so load balancers can read the body;
    `status` flips to "degraded" when a dependency is down.
    """
    from app.core.database import db

    database = "error"
    try:
        await db.client.admin.command("ping")
        database = "connected"
    except Exception:
        pass

    return {
        "status": "healthy" if database == "connected" else "degraded",
        "database": database,
        "version": settings.APP_VERSION,
        "uptime_seconds": int((datetime.utcnow() - _STARTED_AT).total_seconds()),
    }


# Debug endpoint to check CORS configuration
@app.get("/debug/cors")
async def debug_cors():
    """Debug endpoint to check CORS configuration"""
    import os
    return {
        "cors_origins": settings.CORS_ORIGINS,
        "cors_origins_env": os.getenv('CORS_ORIGINS', 'NOT SET'),
        "frontend_url": settings.FRONTEND_URL,
        "frontend_url_env": os.getenv('FRONTEND_URL', 'NOT SET'),
    }


# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path="/socket.io"
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:socket_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )
