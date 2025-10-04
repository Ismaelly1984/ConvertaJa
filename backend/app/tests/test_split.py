from __future__ import annotations

import os

import pytest
from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError

from app.services.split_service import split_pdf
from app.utils.ranges import parse_ranges


def make_pdf(path: str, pages: int = 5) -> None:
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=72, height=72)
    with open(path, "wb") as f:
        w.write(f)


def test_split_pdf(tmp_path):
    src = tmp_path / "src.pdf"
    make_pdf(str(src), 5)
    parts = parse_ranges("1-2,5", 5)
    out1 = tmp_path / "p1.pdf"
    out2 = tmp_path / "p2.pdf"
    res = split_pdf(str(src), parts, [str(out1), str(out2)])
    assert len(res) == len(parts)
    assert os.path.exists(res[0]) and os.path.exists(res[1])
    TWO = 2
    ONE = 1
    assert len(PdfReader(res[0]).pages) == TWO
    assert len(PdfReader(res[1]).pages) == ONE


def test_split_pdf_corrupted_input_raises(tmp_path):
    src = tmp_path / "src.pdf"
    # Write invalid content (not a PDF)
    src.write_bytes(b"this is not a pdf")
    parts = [(1, 1)]
    out = tmp_path / "out.pdf"
    with pytest.raises(PdfReadError):
        split_pdf(str(src), parts, [str(out)])
