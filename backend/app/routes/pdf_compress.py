from __future__ import annotations

import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.config import Settings
from app.deps import get_app_settings
from app.services.compress_service import Quality, compress_pdf
from app.utils.validators import stream_save_pdf

router = APIRouter()


def _cleanup_paths(paths: list[str]) -> None:
    for p in paths:
        try:
            os.remove(p)
        except Exception:
            pass


@router.post("/compress", response_class=FileResponse)
async def compress_endpoint(
    file: UploadFile = File(...),
    quality: Quality = Form(..., description="low|medium|high"),
    settings: Settings = Depends(get_app_settings),
):
    input_path = await stream_save_pdf(
        file, settings.TMP_DIR, settings.MAX_FILE_MB * 1024 * 1024, "Apenas PDF é aceito"
    )
    out_path = os.path.join(settings.TMP_DIR, f"{uuid4()}-compressed.pdf")
    try:
        compress_pdf(input_path, out_path, quality)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    headers = {"Content-Disposition": 'attachment; filename="compressed.pdf"'}
    bg = BackgroundTask(_cleanup_paths, [input_path, out_path])
    return FileResponse(out_path, media_type="application/pdf", headers=headers, background=bg)
