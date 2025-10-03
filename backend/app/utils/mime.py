from __future__ import annotations

import os

PDF_MIME = "application/pdf"
PDF_MIMES = {
    PDF_MIME,
    "application/x-pdf",
    "application/acrobat",
    "application/vnd.pdf",
    "application/octet-stream",  # alguns navegadores/serviços enviam assim
    "binary/octet-stream",
    "application/force-download",
}
IMAGE_MIMES = {"image/jpeg", "image/png"}


def is_pdf(filename: str, content_type: str | None) -> bool:
    if content_type in PDF_MIMES:
        return True
    return os.path.splitext(filename)[1].lower() == ".pdf"


def looks_like_pdf(data: bytes) -> bool:
    """Detecta PDF pelo cabeçalho mágico.
    Um PDF válido geralmente inicia com b"%PDF-".
    """
    try:
        # Ignora bytes iniciais de whitespace/UTF-8 BOM se houver
        start = data.lstrip()[:5]
        return start == b"%PDF-"
    except Exception:
        return False


def is_image(filename: str, content_type: str | None) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    if content_type in IMAGE_MIMES:
        return True
    return ext in {".jpg", ".jpeg", ".png"}
