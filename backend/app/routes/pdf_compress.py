from __future__ import annotations

import os
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import Settings
from app.deps import get_app_settings
from app.utils.files import save_upload
from app.utils.mime import is_pdf, looks_like_pdf
from app.services.compress_service import Quality, compress_pdf
from app.utils.security import pdf_has_javascript


router = APIRouter()


@router.post("/compress", response_class=FileResponse)
async def compress_endpoint(
    file: UploadFile = File(...),
    quality: Quality = Form(..., description="low|medium|high"),
    settings: Settings = Depends(get_app_settings),
):
    data = await file.read()
    if not (is_pdf(file.filename, file.content_type) or looks_like_pdf(data)):
        raise HTTPException(status_code=415, detail="Apenas PDF é aceito")
    if len(data) > settings.MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de tamanho")
    input_path = save_upload(settings.TMP_DIR, file.filename, data)
    if pdf_has_javascript(input_path):
        raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")
    out_path = os.path.join(settings.TMP_DIR, "compressed.pdf")
    try:
        compress_pdf(input_path, out_path, quality)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    headers = {"Content-Disposition": 'attachment; filename="compressed.pdf"'}
    return FileResponse(out_path, media_type="application/pdf", headers=headers)
