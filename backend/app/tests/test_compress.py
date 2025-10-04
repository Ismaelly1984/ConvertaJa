from __future__ import annotations

import os
import subprocess
from types import SimpleNamespace

import pytest
from pypdf import PdfWriter

from app.services.compress_service import compress_pdf


def make_pdf(path: str, pages: int = 1) -> None:
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=72, height=72)
    with open(path, "wb") as f:
        w.write(f)


def test_compress_pdf_mocks_subprocess(tmp_path, monkeypatch):
    src = tmp_path / "src.pdf"
    out = tmp_path / "out.pdf"
    make_pdf(str(src), 1)

    def fake_run(args, capture_output=False, **kwargs):  # noqa: ARG001
        # Simula Ghostscript gerando o arquivo de saída
        for a in args:
            if isinstance(a, str) and a.startswith("-sOutputFile="):
                out_path = a.split("=", 1)[1]
                with open(out_path, "wb") as f:
                    f.write(b"%PDF-1.4\n%%EOF\n")
        return SimpleNamespace(returncode=0, stderr=b"")

    monkeypatch.setattr(subprocess, "run", fake_run)
    res = compress_pdf(str(src), str(out), "medium")
    assert os.path.exists(res)


def test_compress_pdf_raises_on_subprocess_error(tmp_path, monkeypatch):
    src = tmp_path / "src.pdf"
    out = tmp_path / "out.pdf"
    make_pdf(str(src), 1)

    def fake_run(args, capture_output=False, **kwargs):  # noqa: ARG001
        return SimpleNamespace(returncode=1, stderr=b"ghostscript error")

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(RuntimeError):
        compress_pdf(str(src), str(out), "low")
