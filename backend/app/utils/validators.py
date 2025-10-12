from __future__ import annotations

import os
import uuid

from fastapi import HTTPException, UploadFile

from app.utils.files import ensure_dir, save_upload
from app.utils.mime import is_image, is_pdf, looks_like_pdf
from app.utils.security import pdf_has_javascript


def _ensure_size(data: bytes, max_bytes: int) -> None:
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de tamanho")


def _ensure_pdf_signature(filename: str, content_type: str | None, data: bytes, msg: str) -> None:
    if not (is_pdf(filename, content_type) or looks_like_pdf(data)):
        raise HTTPException(status_code=415, detail=msg)


async def validate_and_save_pdf(
    upload: UploadFile,
    tmp_dir: str,
    max_bytes: int,
    type_error_msg: str = "Apenas PDF é aceito",
) -> tuple[str, int]:
    data = await upload.read()
    _ensure_size(data, max_bytes)
    _ensure_pdf_signature(upload.filename, upload.content_type, data, type_error_msg)
    path = save_upload(tmp_dir, upload.filename, data)
    if pdf_has_javascript(path):
        raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")
    return path, len(data)


async def validate_and_save_pdfs_for_merge(
    files: list[UploadFile],
    tmp_dir: str,
    max_bytes: int,
    total_limit_bytes: int,
) -> list[str]:
    total = 0
    paths: list[str] = []
    for f in files:
        p, size = await validate_and_save_pdf(f, tmp_dir, max_bytes, "Apenas PDFs são aceitos")
        total += size
        if total > total_limit_bytes:
            raise HTTPException(status_code=413, detail="Soma dos arquivos excede 100MB")
        paths.append(p)
    return paths


async def validate_and_save_pdf_or_image_for_ocr(
    upload: UploadFile,
    tmp_dir: str,
    max_bytes: int,
) -> str:
    data = await upload.read()
    _ensure_size(data, max_bytes)
    # PDF: assinatura + JS; Imagem: tipo básico
    if is_pdf(upload.filename, upload.content_type) or looks_like_pdf(data):
        path = save_upload(tmp_dir, upload.filename, data)
        if pdf_has_javascript(path):
            raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")
        return path
    if not is_image(upload.filename, upload.content_type):
        raise HTTPException(status_code=415, detail="Apenas PDF/JPG/PNG são aceitos")
    return save_upload(tmp_dir, upload.filename, data)


async def stream_save_pdf(
    upload: UploadFile,
    tmp_dir: str,
    max_bytes: int,
    type_error_msg: str = "Apenas PDF é aceito",
) -> str:
    """Grava UploadFile em disco em chunks, validando tamanho e assinatura real de PDF.
    - Aceita como PDF se (ext/MIME) OU (cabeçalho mágico "%PDF-").
    - Bloqueia PDFs com JS/ações embutidas.
    Retorna o caminho salvo.
    """
    ensure_dir(tmp_dir)
    ext = os.path.splitext(upload.filename or "")[1].lower()
    out_path = os.path.join(tmp_dir, f"{uuid.uuid4()}{ext}")
    total = 0
    head_checked = False
    try:
        with open(out_path, "wb") as f:
            while True:
                chunk = await upload.read(1024 * 64)
                if not chunk:
                    break
                if not head_checked:
                    if not (is_pdf(upload.filename, upload.content_type) or looks_like_pdf(chunk)):
                        raise HTTPException(status_code=415, detail=type_error_msg)
                    head_checked = True
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413, detail="Arquivo excede o limite de tamanho"
                    )
                f.write(chunk)
        if pdf_has_javascript(out_path):
            raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")
        return out_path
    except HTTPException:
        try:
            os.remove(out_path)
        except Exception:
            pass
        raise


async def stream_save_pdfs_for_merge(
    files: list[UploadFile],
    tmp_dir: str,
    max_bytes: int,
    total_limit_bytes: int,
) -> list[str]:
    """Versão streaming para merge com limite total acumulado.
    Limpa arquivos já salvos caso exceda o limite.
    """
    paths: list[str] = []
    total = 0
    try:
        for up in files:
            p = await stream_save_pdf(up, tmp_dir, max_bytes, "Apenas PDFs são aceitos")
            paths.append(p)
            try:
                total += os.path.getsize(p)
            except OSError:
                pass
            if total > total_limit_bytes:
                raise HTTPException(status_code=413, detail="Soma dos arquivos excede 100MB")
        return paths
    except HTTPException:
        for p in paths:
            try:
                os.remove(p)
            except Exception:
                pass
        raise
