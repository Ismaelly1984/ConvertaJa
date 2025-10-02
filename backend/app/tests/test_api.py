from __future__ import annotations

import io
import os

import pytest
from httpx import AsyncClient

from app.main import app


def make_pdf_bytes(pages: int = 1) -> bytes:
    from pypdf import PdfWriter

    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=72, height=72)
    bio = io.BytesIO()
    w.write(bio)
    return bio.getvalue()


@pytest.mark.asyncio
async def test_merge_basic(tmp_path, monkeypatch):
    # Evita gravar fora do tmp
    monkeypatch.setenv("TMP_DIR", str(tmp_path))
    content1 = make_pdf_bytes(1)
    content2 = make_pdf_bytes(1)
    files = [
        ("files", ("a.pdf", content1, "application/pdf")),
        ("files", ("b.pdf", content2, "application/pdf")),
    ]
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post("/api/pdf/merge", files=files)
        assert resp.status_code == 200
        assert resp.headers.get("content-disposition", "").startswith("attachment;")


@pytest.mark.asyncio
async def test_split_invalid_ranges(tmp_path, monkeypatch):
    monkeypatch.setenv("TMP_DIR", str(tmp_path))
    content = make_pdf_bytes(2)
    files = {"file": ("src.pdf", content, "application/pdf")}
    data = {"ranges": ""}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post("/api/pdf/split", files=files, data=data)
        assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_too_large_header(monkeypatch):
    # Força Content-Length alto para 413
    async with AsyncClient(app=app, base_url="http://test") as ac:
        headers = {"Content-Length": str(26 * 1024 * 1024)}
        resp = await ac.post("/api/pdf/merge", headers=headers)
        assert resp.status_code == 413

