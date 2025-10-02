from __future__ import annotations

import os
from typing import List

from pypdf import PdfReader, PdfWriter


def merge_pdfs(paths: List[str], output_path: str) -> str:
    writer = PdfWriter()
    for p in paths:
        reader = PdfReader(p)
        for page in reader.pages:
            writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

