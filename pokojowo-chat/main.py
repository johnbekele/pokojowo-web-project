from datetime import datetime
import logging

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.socket import sio
from app.models.chat import Chat
from app.models.message import Message

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

_STARTED_AT = datetime.utcnow()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Chat microservice for Pokojowo",
    docs_url="/api-docs",
    redoc_url="/api-redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Pokojowo Chat service...")
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION, "service": "chat"}


@app.get("/health/stats")
async def health_stats():
    return {
        "total_chats": await Chat.count(),
        "total_messages": await Message.count(),
    }


@app.get("/health/details")
async def health_details():
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


socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="/chat-socket.io")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:socket_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
    )
