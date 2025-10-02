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


def get_settings() -> Settings:
    port = int(os.getenv("PORT", "8000"))
    env = os.getenv("ENV", "production")
    max_mb = int(os.getenv("MAX_FILE_MB", "25"))
    async_jobs = os.getenv("ASYNC_JOBS", "true").lower() == "true"
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    tmp_dir = os.getenv("TMP_DIR", "/tmp/convertaja")
    ttl = int(os.getenv("TTL_UPLOAD_MINUTES", "30"))
    langs = os.getenv("OCR_LANGS", "por,eng").split(",")
    langs = [l.strip() for l in langs if l.strip()]
    return Settings(
        PORT=port,
        ENV=env,
        MAX_FILE_MB=max_mb,
        ASYNC_JOBS=async_jobs,
        REDIS_URL=redis_url,
        TMP_DIR=tmp_dir,
        TTL_UPLOAD_MINUTES=ttl,
        OCR_LANGS=langs,
    )

