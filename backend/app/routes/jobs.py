from __future__ import annotations

import os
from typing import Any, Literal

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pypdf import PdfReader

from app.config import Settings
from app.deps import get_app_settings
from app.utils.files import secure_tmp_join
from app.utils.ranges import RangeParseError, parse_ranges
from app.utils.mime import is_pdf
from app.utils.security import is_uuid4
from app.utils.validators import stream_save_pdf, stream_save_pdfs_for_merge

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
        total_limit = 100 * 1024 * 1024
        max_bytes = settings.MAX_FILE_MB * 1024 * 1024
        inputs = await stream_save_pdfs_for_merge(files, tmp, max_bytes, total_limit)
        from app.workers import tasks  # noqa: PLC0415  # import tardio

        res = tasks.task_merge.apply_async(kwargs={"tmp_dir": tmp, "inputs": inputs})
        return {"jobId": res.id}

    if type == "split":
        if not file:
            raise HTTPException(status_code=400, detail="Envie o PDF")
        input_path = await stream_save_pdf(
            file, tmp, settings.MAX_FILE_MB * 1024 * 1024, "Apenas PDF é aceito"
        )
        if not ranges:
            raise HTTPException(status_code=400, detail="Informe ranges")
        total = len(PdfReader(input_path).pages)
        try:
            pr = parse_ranges(ranges, total)
        except RangeParseError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        from app.workers import tasks  # noqa: PLC0415  # import tardio

        res = tasks.task_split.apply_async(
            kwargs={"tmp_dir": tmp, "input_path": input_path, "ranges": pr}
        )
        return {"jobId": res.id}

    if type == "compress":
        if not file:
            raise HTTPException(status_code=400, detail="Envie o PDF")
        input_path = await stream_save_pdf(
            file, tmp, settings.MAX_FILE_MB * 1024 * 1024, "Apenas PDF é aceito"
        )
        if quality not in {"low", "medium", "high"}:
            raise HTTPException(status_code=400, detail="quality inválido")
        from app.workers import tasks  # noqa: PLC0415  # import tardio

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
        input_path = await stream_save_pdf(
            file, tmp, settings.MAX_FILE_MB * 1024 * 1024, "Apenas PDF é aceito"
        )
        if format not in {"jpg", "png"} or not dpi:
            raise HTTPException(status_code=400, detail="Parâmetros inválidos")
        from app.workers import tasks  # noqa: PLC0415  # import tardio

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
        langs = (lang or "por").split("+")
        if is_pdf(file.filename, file.content_type or ""):
            input_path = await stream_save_pdf(
                file, tmp, settings.MAX_FILE_MB * 1024 * 1024, "Apenas PDF é aceito"
            )
        else:
            data = await file.read()
            if len(data) > settings.MAX_FILE_MB * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Arquivo excede o limite de tamanho")
            # Reutiliza caminho simples para imagens
            from app.utils.files import save_upload  # local import to avoid unused when not needed

            input_path = save_upload(tmp, file.filename, data)
        from app.workers import tasks  # noqa: PLC0415  # import tardio

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
        from app.workers.celery_app import celery as _celery  # noqa: PLC0415  # import tardio
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=503, detail="Fila de jobs indisponível") from err
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
    if not is_uuid4(job_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    # tenta deduzir extensão comum
    for ext, mime in (
        (".pdf", "application/pdf"),
        (".zip", "application/zip"),
        (".txt", "text/plain"),
    ):
        try:
            path = secure_tmp_join(settings.TMP_DIR, f"job-{job_id}{ext}")
        except ValueError:
            continue
        if os.path.exists(path):
            headers = {
                "Content-Disposition": f'attachment; filename="result{ext}"',
                "Cache-Control": "no-store",
            }
            return FileResponse(path, media_type=mime, headers=headers)
    raise HTTPException(status_code=404, detail="Resultado do job não encontrado")
