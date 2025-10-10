from __future__ import annotations

import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.config import Settings
from app.deps import get_app_settings
from app.services.merge_service import merge_pdfs
from app.utils.files import save_upload
from app.utils.mime import is_pdf, looks_like_pdf
from app.utils.security import pdf_has_javascript

router = APIRouter()


def _cleanup_paths(paths: list[str]) -> None:
    for p in paths:
        try:
            os.remove(p)
        except Exception:
            pass


@router.post("/merge", response_class=FileResponse)
async def merge_endpoint(
    files: list[UploadFile] = File(..., description="2-20 PDFs"),
    settings: Settings = Depends(get_app_settings),
):
    MIN_FILES, MAX_FILES = 2, 20
    if not (MIN_FILES <= len(files) <= MAX_FILES):
        raise HTTPException(status_code=400, detail="Envie entre 2 e 20 PDFs")

    # Validação de MIME e tamanho total (<= 100MB)
    total_size = 0
    input_paths: list[str] = []
    max_bytes = settings.MAX_FILE_MB * 1024 * 1024
    for f in files:
        data = await f.read()
        if not (is_pdf(f.filename, f.content_type) or looks_like_pdf(data)):
            raise HTTPException(status_code=415, detail="Apenas PDFs são aceitos")
        total_size += len(data)
        if total_size > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Soma dos arquivos excede 100MB")
        if len(data) > max_bytes:
            raise HTTPException(status_code=413, detail="Arquivo excede o limite de tamanho")
        p = save_upload(settings.TMP_DIR, f.filename, data)
        if pdf_has_javascript(p):
            raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")
        input_paths.append(p)

    # Saída única por requisição + limpeza pós-envio
    out_path = os.path.join(settings.TMP_DIR, f"{uuid4()}-merged.pdf")
    merge_pdfs(input_paths, out_path)
    headers = {"Content-Disposition": 'attachment; filename="merged.pdf"'}
    bg = BackgroundTask(_cleanup_paths, input_paths + [out_path])
    return FileResponse(out_path, media_type="application/pdf", headers=headers, background=bg)
