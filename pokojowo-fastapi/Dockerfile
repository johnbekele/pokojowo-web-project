# Production-optimized Dockerfile for Render
# Multi-stage build for minimal image size and fast startup

# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================
# Stage 2: Production
# ============================================
FROM python:3.11-slim as production

# Labels for Render
LABEL maintainer="johnbekele"
LABEL version="1.0"
LABEL description="Pokojowo FastAPI Backend - Optimized for Render"

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Performance environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=2 \
    PYTHONHASHSEED=random \
    # Uvloop for faster async
    UVLOOP_INSTALL=1 \
    # Faster JSON with orjson
    ORJSON_SERIALIZE=1 \
    # Connection pooling
    MONGODB_MAX_POOL_SIZE=50 \
    MONGODB_MIN_POOL_SIZE=10 \
    # Render specific
    PORT=10000

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/photo uploads/listing data && \
    chmod -R 755 uploads

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port (Render uses 10000 by default)
EXPOSE 10000

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Production server with Gunicorn + Uvicorn workers
# - Workers: 2-4 for Render free tier, scale based on CPU
# - Keep-alive: 120s for better connection reuse
# - Graceful timeout: 30s for clean shutdowns
CMD ["sh", "-c", "gunicorn main:socket_app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers ${GUNICORN_WORKERS:-2} \
    --bind 0.0.0.0:${PORT:-10000} \
    --timeout 120 \
    --keep-alive 120 \
    --graceful-timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --preload"]
