from __future__ import annotations

import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pypdf import PdfReader
from starlette.background import BackgroundTask

from app.config import Settings
from app.deps import get_app_settings
from app.services.split_service import split_pdf
from app.utils.files import save_upload, zip_paths
from app.utils.mime import is_pdf, looks_like_pdf
from app.utils.ranges import RangeParseError, parse_ranges
from app.utils.security import pdf_has_javascript

router = APIRouter()


def _cleanup_paths(paths: list[str]) -> None:
    for p in paths:
        try:
            os.remove(p)
        except Exception:
            pass


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
        raise HTTPException(status_code=400, detail=str(e)) from e

    out_paths: list[str] = []
    prefix = str(uuid4())
    for idx, _ in enumerate(parts, start=1):
        out_paths.append(os.path.join(settings.TMP_DIR, f"{prefix}-split-{idx}.pdf"))
    res = split_pdf(input_path, parts, out_paths)
    zip_path = os.path.join(settings.TMP_DIR, f"{prefix}-split.zip")
    zip_paths(zip_path, res)
    headers = {"Content-Disposition": 'attachment; filename="split.zip"'}
    # Limpa PDF de entrada, partes e zip após envio
    to_delete = [input_path] + res + [zip_path]
    bg = BackgroundTask(_cleanup_paths, to_delete)
    return FileResponse(zip_path, media_type="application/zip", headers=headers, background=bg)
