from __future__ import annotations

import io
import os

from pypdf import PdfWriter
from app.services.merge_service import merge_pdfs


def make_pdf(path: str, pages: int = 1) -> None:
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=72, height=72)
    with open(path, "wb") as f:
        w.write(f)


def test_merge_pdfs(tmp_path):
    a = tmp_path / "a.pdf"
    b = tmp_path / "b.pdf"
    out = tmp_path / "out.pdf"
    make_pdf(str(a), 2)
    make_pdf(str(b), 3)
    res = merge_pdfs([str(a), str(b)], str(out))
    assert os.path.exists(res)

