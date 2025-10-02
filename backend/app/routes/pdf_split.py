from __future__ import annotations

import os
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import Settings
from app.deps import get_app_settings
from app.utils.files import save_upload, zip_paths
from app.utils.mime import is_pdf, looks_like_pdf
from app.utils.ranges import RangeParseError, parse_ranges
from app.utils.security import pdf_has_javascript
from app.services.split_service import split_pdf
from pypdf import PdfReader


router = APIRouter()


@router.post("/split", response_class=FileResponse)
async def split_endpoint(
    file: UploadFile = File(...),
    ranges: str = Form(..., description='ex: "1-3,5,7-8"'),
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

    total_pages = len(PdfReader(input_path).pages)
    try:
        parts = parse_ranges(ranges, total_pages)
    except RangeParseError as e:
        raise HTTPException(status_code=400, detail=str(e))

    out_paths: List[str] = []
    for idx, _ in enumerate(parts, start=1):
        out_paths.append(os.path.join(settings.TMP_DIR, f"split-{idx}.pdf"))
    res = split_pdf(input_path, parts, out_paths)
    zip_path = os.path.join(settings.TMP_DIR, "split.zip")
    zip_paths(zip_path, res)
    headers = {"Content-Disposition": 'attachment; filename="split.zip"'}
    return FileResponse(zip_path, media_type="application/zip", headers=headers)
