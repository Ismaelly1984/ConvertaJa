from __future__ import annotations

import os
from typing import Any, Literal

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pypdf import PdfReader

from app.config import Settings
from app.deps import get_app_settings
from app.utils.files import save_upload
from app.utils.mime import is_image, is_pdf
from app.utils.ranges import RangeParseError, parse_ranges
# Importações de Celery/tarefas são feitas sob demanda dentro das rotas
# para evitar falhas de import quando o ambiente não possui Celery runtime
# (ex.: cenários de teste que não exercem endpoints de jobs).

router = APIRouter()


JobType = Literal["merge", "split", "compress", "to-images", "ocr"]
MIN_FILES_FOR_MERGE = 2


@router.post("/jobs")
async def create_job(  # noqa: PLR0913, PLR0912, PLR0915
    type: JobType = Form(...),
    settings: Settings = Depends(get_app_settings),
    # merge
    files: list[UploadFile] | None = None,
    # others
    file: UploadFile | None = None,
    ranges: str | None = Form(None),
    quality: str | None = Form(None),
    format: str | None = Form(None),
    dpi: int | None = Form(None),
    lang: str | None = Form(None),
):
    if not settings.ASYNC_JOBS:
        raise HTTPException(status_code=400, detail="Jobs assíncronos desabilitados")

    tmp = settings.TMP_DIR

    if type == "merge":
        if not files or len(files) < MIN_FILES_FOR_MERGE:
            raise HTTPException(status_code=400, detail="Envie 2+ PDFs para merge")
        inputs = []
        for f in files:
            if not is_pdf(f.filename, f.content_type):
                raise HTTPException(status_code=415, detail="Apenas PDFs são aceitos")
            data = await f.read()
            inputs.append(save_upload(tmp, f.filename, data))
        from app.workers import tasks  # import tardio
        res = tasks.task_merge.apply_async(kwargs={"tmp_dir": tmp, "inputs": inputs})
        return {"jobId": res.id}

    if type == "split":
        if not file:
            raise HTTPException(status_code=400, detail="Envie o PDF")
        if not is_pdf(file.filename, file.content_type):
            raise HTTPException(status_code=415, detail="Apenas PDF é aceito")
        if not ranges:
            raise HTTPException(status_code=400, detail="Informe ranges")
        data = await file.read()
        input_path = save_upload(tmp, file.filename, data)
        total = len(PdfReader(input_path).pages)
        try:
            pr = parse_ranges(ranges, total)
        except RangeParseError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        from app.workers import tasks  # import tardio
        res = tasks.task_split.apply_async(
            kwargs={"tmp_dir": tmp, "input_path": input_path, "ranges": pr}
        )
        return {"jobId": res.id}

    if type == "compress":
        if not file:
            raise HTTPException(status_code=400, detail="Envie o PDF")
        if not is_pdf(file.filename, file.content_type):
            raise HTTPException(status_code=415, detail="Apenas PDF é aceito")
        if quality not in {"low", "medium", "high"}:
            raise HTTPException(status_code=400, detail="quality inválido")
        data = await file.read()
        input_path = save_upload(tmp, file.filename, data)
        from app.workers import tasks  # import tardio
        res = tasks.task_compress.apply_async(
            kwargs={
                "tmp_dir": tmp,
                "input_path": input_path,
                "quality": quality,
            }
        )
        return {"jobId": res.id}

    if type == "to-images":
        if not file:
            raise HTTPException(status_code=400, detail="Envie o PDF")
        if not is_pdf(file.filename, file.content_type):
            raise HTTPException(status_code=415, detail="Apenas PDF é aceito")
        if format not in {"jpg", "png"} or not dpi:
            raise HTTPException(status_code=400, detail="Parâmetros inválidos")
        data = await file.read()
        input_path = save_upload(tmp, file.filename, data)
        from app.workers import tasks  # import tardio
        res = tasks.task_to_images.apply_async(
            kwargs={
                "tmp_dir": tmp,
                "input_path": input_path,
                "fmt": format,
                "dpi": dpi,
            }
        )
        return {"jobId": res.id}

    if type == "ocr":
        if not file:
            raise HTTPException(status_code=400, detail="Envie o PDF/Imagem")
        if not (
            is_pdf(file.filename, file.content_type) or is_image(file.filename, file.content_type)
        ):
            raise HTTPException(status_code=415, detail="Apenas PDF/JPG/PNG são aceitos")
        langs = (lang or "por").split("+")
        data = await file.read()
        input_path = save_upload(tmp, file.filename, data)
        from app.workers import tasks  # import tardio
        res = tasks.task_ocr.apply_async(
            kwargs={
                "tmp_dir": tmp,
                "input_path": input_path,
                "langs": langs,
            }
        )
        return {"jobId": res.id}

    raise HTTPException(status_code=400, detail="Tipo de job inválido")


@router.get("/jobs/{job_id}")
async def job_status(job_id: str):
    try:
        from app.workers.celery_app import celery as _celery  # import tardio
    except Exception:
        raise HTTPException(status_code=503, detail="Fila de jobs indisponível")
    ar = _celery.AsyncResult(job_id)
    if ar.state == "PENDING":
        return {"status": "queued", "progress": 0}
    if ar.state == "STARTED":
        return {"status": "running", "progress": 50}
    if ar.state == "SUCCESS":
        payload: dict[str, Any] = ar.result or {}
        return {
            "status": "done",
            "progress": 100,
            "resultUrl": f"/api/jobs/{job_id}/download",
            "contentType": payload.get("content_type"),
        }
    if ar.state == "FAILURE":
        return {"status": "error", "progress": 100}
    return {"status": ar.state.lower(), "progress": 0}


@router.get("/jobs/{job_id}/download")
async def job_download(job_id: str, settings: Settings = Depends(get_app_settings)):
    # tenta deduzir extensão comum
    for ext, mime in (
        (".pdf", "application/pdf"),
        (".zip", "application/zip"),
        (".txt", "text/plain"),
    ):
        path = os.path.join(settings.TMP_DIR, f"job-{job_id}{ext}")
        if os.path.exists(path):
            headers = {"Content-Disposition": f'attachment; filename="result{ext}"'}
            return FileResponse(path, media_type=mime, headers=headers)
    raise HTTPException(status_code=404, detail="Resultado do job não encontrado")
