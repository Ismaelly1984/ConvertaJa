from __future__ import annotations

import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.config import Settings
from app.deps import get_app_settings
from app.services.merge_service import merge_pdfs
from app.utils.validators import stream_save_pdfs_for_merge

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

    # Streaming + limite total (<= 100MB)
    max_bytes = settings.MAX_FILE_MB * 1024 * 1024
    input_paths = await stream_save_pdfs_for_merge(
        files, settings.TMP_DIR, max_bytes, 100 * 1024 * 1024
    )

    # Saída única por requisição + limpeza pós-envio
    out_path = os.path.join(settings.TMP_DIR, f"{uuid4()}-merged.pdf")
    merge_pdfs(input_paths, out_path)
    headers = {"Content-Disposition": 'attachment; filename="merged.pdf"'}
    bg = BackgroundTask(_cleanup_paths, input_paths + [out_path])
    return FileResponse(out_path, media_type="application/pdf", headers=headers, background=bg)
