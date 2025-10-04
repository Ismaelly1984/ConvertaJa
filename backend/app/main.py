from __future__ import annotations

import os
import threading
import time
import uuid
from collections.abc import Iterable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
from contextlib import asynccontextmanager

from app.config import Settings, get_settings
from app.routes import health, jobs, ocr, pdf_compress, pdf_merge, pdf_split, pdf_to_images
from app.services.cleanup_service import cleanup_tmp_dir_periodically
from app.utils.logging import configure_logging, log_request
from app.utils.security import add_csp_headers

settings: Settings = get_settings()


@asynccontextmanager
async def lifespan_ctx(_app: FastAPI):
    os.makedirs(settings.TMP_DIR, exist_ok=True)
    th = threading.Thread(
        target=cleanup_tmp_dir_periodically,
        kwargs={
            "tmp_dir": settings.TMP_DIR,
            "ttl_minutes": settings.TTL_UPLOAD_MINUTES,
            "interval_seconds": 60,
        },
        daemon=True,
    )
    th.start()
    yield


app = FastAPI(
    title="ConvertaJá API",
    version="0.1.0",
    description="API para conversão/manipulação de PDFs (MVP)",
    lifespan=lifespan_ctx,
)


# CORS
origins: Iterable[str] = []
cors_env = os.getenv("CORS_ORIGINS")
if cors_env:
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]

if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(origins),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Configure logging
configure_logging()


# --- Simple in-memory rate limiter (60 req / 10 min por IP) ---
RATE_LIMIT = 60
WINDOW_SECONDS = 600
_rate_store: dict[str, list[float]] = {}
_rate_lock = threading.Lock()


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    # Request ID
    request_id = str(uuid.uuid4())
    start = time.time()

    # Content-Length check (preliminar)
    max_bytes = settings.MAX_FILE_MB * 1024 * 1024
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit():
        if int(content_length) > max_bytes:
            return Response(
                content="Arquivo excede o limite de tamanho.",
                status_code=413,
                media_type="text/plain",
            )

    # Rate limiting por IP
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    with _rate_lock:
        hits = _rate_store.get(client_ip, [])
        hits = [h for h in hits if now - h <= WINDOW_SECONDS]
        if len(hits) >= RATE_LIMIT:
            return Response(
                content="Muitas requisições. Tente novamente mais tarde.",
                status_code=429,
                media_type="text/plain",
            )
        hits.append(now)
        _rate_store[client_ip] = hits

    response = await call_next(request)
    # Add headers
    response.headers["X-Request-ID"] = request_id
    add_csp_headers(response)

    # Logging
    duration_ms = int((time.time() - start) * 1000)
    log_request(request, response.status_code, request_id, duration_ms)
    return response


# Routers
app.include_router(pdf_merge.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(pdf_split.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(pdf_compress.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(pdf_to_images.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(ocr.router, prefix="/api", tags=["ocr"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(health.router, prefix="/api", tags=["health"])
