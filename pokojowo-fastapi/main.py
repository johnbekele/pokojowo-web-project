from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
import socketio
import logging
from pathlib import Path

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1.api import api_router
from app.core.socket import sio

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

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
)

# Mount static files (uploads)
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
            "messages": f"{settings.API_V1_STR}/messages",
            "chat": f"{settings.API_V1_STR}/chat",
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
