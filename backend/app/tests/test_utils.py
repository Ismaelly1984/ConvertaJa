from __future__ import annotations

import os
from pypdf import PdfWriter


def make_blank_pdf(path: str, pages: int = 1) -> None:
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=200, height=200)
    with open(path, "wb") as f:
        w.write(f)

