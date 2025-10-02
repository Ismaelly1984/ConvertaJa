from __future__ import annotations

import os
from typing import List, Literal

from pdf2image import convert_from_path


ImageFormat = Literal["jpg", "png"]


def pdf_to_images(input_path: str, out_dir: str, fmt: ImageFormat, dpi: int) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    images = convert_from_path(input_path, dpi=dpi)
    paths: List[str] = []
    ext = "jpg" if fmt == "jpg" else "png"
    for idx, img in enumerate(images, start=1):
        out_path = os.path.join(out_dir, f"p{idx}.{ext}")
        img.save(out_path, format="JPEG" if fmt == "jpg" else "PNG")
        paths.append(out_path)
    return paths

