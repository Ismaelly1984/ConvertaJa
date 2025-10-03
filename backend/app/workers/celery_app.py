from __future__ import annotations

import os

from celery import Celery

broker_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
backend_url = broker_url

celery = Celery(
    "converta_ja",
    broker=broker_url,
    backend=backend_url,
)

celery.conf.accept_content = ["json"]
celery.conf.task_serializer = "json"
celery.conf.result_serializer = "json"
celery.conf.task_track_started = True
celery.conf.worker_prefetch_multiplier = 1

