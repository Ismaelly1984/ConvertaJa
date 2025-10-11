from __future__ import annotations

import uuid

from starlette.responses import Response


def pdf_has_javascript(path: str) -> bool:
    try:
        with open(path, "rb") as f:
            data = f.read(2_000_000)  # lê até 2MB para heurística simples
        # Heurística conservadora: só marca quando há indícios diretos de JavaScript
        # /OpenAction e /AA ocorrem em PDFs legítimos (ex.: abrir em página X) e geram falso-positivo.
        tokens = [b"/JavaScript", b"/JS"]
        return any(t in data for t in tokens)
    except Exception:  # noqa: BLE001
        return False


def add_csp_headers(response: Response) -> None:
    # Content Security Policy conforme requisitos
    csp = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "font-src 'self' data:; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'"
    )
    response.headers["Content-Security-Policy"] = csp


def is_uuid4(s: str) -> bool:
    try:
        val = uuid.UUID(s, version=4)
    except Exception:  # noqa: BLE001
        return False
    return str(val) == s
