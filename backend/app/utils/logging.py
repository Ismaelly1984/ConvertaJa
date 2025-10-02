from __future__ import annotations

import json
import logging
import os
import re
import sys
from typing import Any


PII_PATTERN = re.compile(r"(authorization: .*?)(?:\r|\n|$)", re.IGNORECASE)


def configure_logging() -> None:
    level = logging.INFO
    if os.getenv("ENV", "production") == "development":
        level = logging.DEBUG

    handler = logging.StreamHandler(sys.stdout)
    fmt = "%(message)s"
    handler.setFormatter(logging.Formatter(fmt))
    logging.basicConfig(level=level, handlers=[handler])


def _mask_pii(s: str) -> str:
    return PII_PATTERN.sub("authorization: ***", s)


def log_request(request, status_code: int, request_id: str, duration_ms: int) -> None:
    try:
        entry: dict[str, Any] = {
            "requestId": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": status_code,
            "durationMs": duration_ms,
            "client": getattr(request.client, "host", None) if request.client else None,
        }
        message = json.dumps(entry, ensure_ascii=False)
        logging.info(_mask_pii(message))
    except Exception:  # noqa: BLE001
        logging.exception("failed to log request")

