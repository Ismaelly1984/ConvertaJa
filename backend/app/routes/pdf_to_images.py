from __future__ import annotations

import os
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pdf2image import convert_from_path
from pdf2image import exceptions as pdf2_exceptions
from pypdf import PdfReader

from app.config import Settings
from app.deps import get_app_settings
from app.utils.files import save_upload
from app.utils.mime import is_pdf, looks_like_pdf
from app.utils.security import pdf_has_javascript

router = APIRouter()


def _convert_pdf_with_limits(input_path: str, dpi: int, max_pages: int):
    try:
        total_pages = len(PdfReader(input_path).pages)
        if total_pages > max_pages:
            raise HTTPException(
                status_code=413,
                detail=(f"PDF excede o limite de páginas (máx {max_pages})"),
            )
        images = convert_from_path(input_path, dpi=dpi)
        return images[:total_pages]
    except pdf2_exceptions.PDFPageCountError as err:
        raise HTTPException(status_code=400, detail="PDF inválido ou sem páginas") from err
    except pdf2_exceptions.PDFInfoNotInstalledError as err:
        raise HTTPException(
            status_code=500, detail="Dependência 'poppler' (pdftoppm) não encontrada no servidor"
        ) from err
    except pdf2_exceptions.PDFSyntaxError as err:
        raise HTTPException(status_code=400, detail="PDF corrompido ou inválido") from err
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Falha ao converter PDF: {str(err)}") from err


@router.post("/to-images")
async def to_images_endpoint(
    file: UploadFile = File(...),
    # Mantém compat com frontend atual, mas saída será sempre PNG
    format: str = Form("png"),
    dpi: int = Form(150, ge=72, le=600),
    settings: Settings = Depends(get_app_settings),
):
    data = await file.read()

    # 413 — tamanho excedido
    if len(data) > settings.MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de tamanho")

    # 415 — não é PDF (MIME ou conteúdo)
    if not (is_pdf(file.filename, file.content_type) or looks_like_pdf(data)):
        raise HTTPException(status_code=415, detail="Apenas PDF é aceito")

    # Salva em disco para checagens e conversão
    input_path = save_upload(settings.TMP_DIR, file.filename, data)

    # 415 — heurística simples de JS/ações em PDF
    if pdf_has_javascript(input_path):
        # Remove upload antes de sair
        try:
            os.remove(input_path)
        except Exception:
            pass
        raise HTTPException(status_code=415, detail="PDF contém JavaScript/ações embutidas")

    try:
        images = _convert_pdf_with_limits(input_path, dpi, settings.PDF_TO_IMAGES_MAX_PAGES)
    finally:
        # Limpa o PDF temporário
        try:
            os.remove(input_path)
        except Exception:
            pass

    if not images:
        raise HTTPException(status_code=400, detail="Nenhuma página encontrada no PDF")

    # Monta o ZIP em memória e garante fechamento antes do envio
    zip_buffer = BytesIO()
    with ZipFile(zip_buffer, "w", ZIP_DEFLATED) as zf:
        for idx, img in enumerate(images, start=1):
            buf = BytesIO()
            img.save(buf, format="PNG")
            zf.writestr(f"page_{idx}.png", buf.getvalue())

    zip_buffer.seek(0)  # garante leitura desde o início

    headers = {"Content-Disposition": 'attachment; filename="images.zip"'}
    return StreamingResponse(zip_buffer, media_type="application/zip", headers=headers)
