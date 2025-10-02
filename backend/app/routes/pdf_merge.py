from __future__ import annotations

import os
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import Settings
from app.deps import get_app_settings
from app.utils.files import save_upload
from app.utils.mime import is_pdf, looks_like_pdf
from app.services.merge_service import merge_pdfs
from app.utils.security import pdf_has_javascript


router = APIRouter()


@router.post("/merge", response_class=FileResponse)
async def merge_endpoint(
    files: List[UploadFile] = File(..., description="2-20 PDFs"),
    settings: Settings = Depends(get_app_settings),
):
    if not (2 <= len(files) <= 20):
        raise HTTPException(status_code=400, detail="Envie entre 2 e 20 PDFs")

    # Validação de MIME e tamanho total (<= 100MB)
    total_size = 0
    input_paths: List[str] = []
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

    out_path = os.path.join(settings.TMP_DIR, "merged.pdf")
    merge_pdfs(input_paths, out_path)
    headers = {"Content-Disposition": 'attachment; filename="merged.pdf"'}
    return FileResponse(out_path, media_type="application/pdf", headers=headers)
