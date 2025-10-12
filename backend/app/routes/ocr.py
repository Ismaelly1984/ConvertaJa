from __future__ import annotations

import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app.config import Settings
from app.deps import get_app_settings
from app.services.ocr_service import ocr_pdf_or_image, save_text
from app.utils.files import save_upload, secure_tmp_join
from app.utils.mime import is_image, is_pdf
from app.utils.security import is_uuid4, pdf_has_javascript

router = APIRouter()


@router.post("/ocr")
async def ocr_endpoint(
    file: UploadFile = File(...),
    lang: str = Form("por", description="por|eng|por+eng"),
    settings: Settings = Depends(get_app_settings),
):
    ct = file.content_type
    if not (is_pdf(file.filename, ct) or is_image(file.filename, ct)):
        raise HTTPException(status_code=415, detail="Apenas PDF/JPG/PNG são aceitos")

    data = await file.read()
    if len(data) > settings.MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de tamanho")

    input_path = save_upload(settings.TMP_DIR, file.filename, data)

    # Bloqueia PDFs com ações/JS
    if is_pdf(file.filename, ct) and pdf_has_javascript(input_path):
        try:
            os.remove(input_path)
        except Exception:
            pass
        raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")

    # Sanitiza idiomas e valida contra configuração
    langs = [s for s in lang.split("+") if s]
    if not langs:
        langs = ["por"]
    allowed = set(settings.OCR_LANGS)
    if not set(langs).issubset(allowed):
        raise HTTPException(
            status_code=400,
            detail=(f"Idiomas não suportados. Permitidos: {', '.join(settings.OCR_LANGS)}"),
        )

    try:
        text = ocr_pdf_or_image(input_path, langs)
    except Exception as e:  # Mapeia erros comuns de runtime (tesseract/poppler)
        # Mensagens típicas: falta 'pdftoppm' (poppler), falta 'por.traineddata', etc.
        msg = str(e)
        # Remove caminho temporário antes de retornar
        try:
            os.remove(input_path)
        except Exception:  # noqa: BLE001
            pass
        raise HTTPException(status_code=500, detail=f"Falha no OCR: {msg}") from e
    finally:
        try:
            os.remove(input_path)
        except Exception:  # noqa: BLE001
            pass

    txt_path = save_text(settings.TMP_DIR, text)
    oid = os.path.splitext(os.path.basename(txt_path))[0]
    return JSONResponse({"text": text, "id": oid})


@router.get("/ocr/download/{id}", response_class=FileResponse)
async def ocr_download(id: str, settings: Settings = Depends(get_app_settings)):
    if not is_uuid4(id):
        raise HTTPException(status_code=400, detail="ID inválido")
    try:
        path = secure_tmp_join(settings.TMP_DIR, f"{id}.txt")
    except ValueError as err:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="ID inválido") from err
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Resultado não encontrado")
    headers = {
        "Content-Disposition": f'attachment; filename="{id}.txt"',
        "Cache-Control": "no-store",
    }
    return FileResponse(path, media_type="text/plain", headers=headers)
