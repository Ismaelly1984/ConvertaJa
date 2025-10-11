from __future__ import annotations

import os
from typing import Literal

from pdf2image import convert_from_path
from pypdf import PdfReader

from app.config import get_settings

ImageFormat = Literal["jpg", "png"]


def pdf_to_images(
    input_path: str, out_dir: str, fmt: ImageFormat, dpi: int, max_pages: int | None = None
) -> list[str]:
    os.makedirs(out_dir, exist_ok=True)
    try:
        total = len(PdfReader(input_path).pages)
    except Exception:
        total = get_settings().PDF_TO_IMAGES_MAX_PAGES
    if max_pages is None:
        max_pages = get_settings().PDF_TO_IMAGES_MAX_PAGES
    last_page = min(total, max_pages)
    images = convert_from_path(input_path, dpi=dpi)
    images = images[:last_page]
    paths: list[str] = []
    ext = "jpg" if fmt == "jpg" else "png"
    for idx, img in enumerate(images, start=1):
        out_path = os.path.join(out_dir, f"p{idx}.{ext}")
        img.save(out_path, format="JPEG" if fmt == "jpg" else "PNG")
        paths.append(out_path)
    return paths
