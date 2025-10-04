from __future__ import annotations

import os

import pytest
from pypdf import PdfWriter
from pypdf.errors import PdfReadError

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


def test_merge_pdfs_corrupted_input(tmp_path):
    # One corrupted (non-PDF) file should cause the merge to fail
    a = tmp_path / "a.pdf"
    b = tmp_path / "b.pdf"
    a.write_bytes(b"not a pdf")
    make_pdf(str(b), 1)
    out = tmp_path / "out.pdf"
    with pytest.raises(PdfReadError):
        merge_pdfs([str(a), str(b)], str(out))
