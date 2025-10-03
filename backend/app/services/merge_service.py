from __future__ import annotations

from pypdf import PdfReader, PdfWriter


def merge_pdfs(paths: list[str], output_path: str) -> str:
    writer = PdfWriter()
    for p in paths:
        reader = PdfReader(p)
        for page in reader.pages:
            writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path
