from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    PORT: int
    ENV: str
    MAX_FILE_MB: int
    ASYNC_JOBS: bool
    REDIS_URL: str
    TMP_DIR: str
    TTL_UPLOAD_MINUTES: int
    OCR_LANGS: list[str]
    PDF_TO_IMAGES_MAX_PAGES: int
    OCR_MAX_PAGES: int
    GS_TIMEOUT_SECONDS: int


def get_settings() -> Settings:
    port = int(os.getenv("PORT", "8000"))
    env = os.getenv("ENV", "production")
    max_mb = int(os.getenv("MAX_FILE_MB", "25"))
    async_jobs = os.getenv("ASYNC_JOBS", "true").lower() == "true"
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    tmp_dir = os.getenv("TMP_DIR", "/tmp/convertaja")
    ttl = int(os.getenv("TTL_UPLOAD_MINUTES", "30"))
    langs = os.getenv("OCR_LANGS", "por,eng").split(",")
    langs = [lang.strip() for lang in langs if lang.strip()]
    to_images_max = int(os.getenv("PDF_TO_IMAGES_MAX_PAGES", "200"))
    ocr_max = int(os.getenv("OCR_MAX_PAGES", "50"))
    gs_timeout = int(os.getenv("GS_TIMEOUT_SECONDS", "120"))
    return Settings(
        PORT=port,
        ENV=env,
        MAX_FILE_MB=max_mb,
        ASYNC_JOBS=async_jobs,
        REDIS_URL=redis_url,
        TMP_DIR=tmp_dir,
        TTL_UPLOAD_MINUTES=ttl,
        OCR_LANGS=langs,
        PDF_TO_IMAGES_MAX_PAGES=to_images_max,
        OCR_MAX_PAGES=ocr_max,
        GS_TIMEOUT_SECONDS=gs_timeout,
    )
