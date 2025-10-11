from __future__ import annotations

from fastapi import HTTPException, UploadFile

from app.utils.files import save_upload
from app.utils.mime import is_image, is_pdf, looks_like_pdf
from app.utils.security import pdf_has_javascript


def _ensure_size(data: bytes, max_bytes: int) -> None:
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de tamanho")


def _ensure_pdf_signature(filename: str, content_type: str | None, data: bytes, msg: str) -> None:
    if not (is_pdf(filename, content_type) or looks_like_pdf(data)):
        raise HTTPException(status_code=415, detail=msg)


async def validate_and_save_pdf(
    upload: UploadFile, tmp_dir: str, max_bytes: int, type_error_msg: str = "Apenas PDF é aceito"
) -> tuple[str, int]:
    data = await upload.read()
    _ensure_size(data, max_bytes)
    _ensure_pdf_signature(upload.filename, upload.content_type, data, type_error_msg)
    path = save_upload(tmp_dir, upload.filename, data)
    if pdf_has_javascript(path):
        raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")
    return path, len(data)


async def validate_and_save_pdfs_for_merge(
    files: list[UploadFile], tmp_dir: str, max_bytes: int, total_limit_bytes: int
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
    upload: UploadFile, tmp_dir: str, max_bytes: int
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

