from __future__ import annotations

import os
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pdf2image import convert_from_path, exceptions as pdf2_exceptions

from app.config import Settings
from app.deps import get_app_settings
from app.utils.files import save_upload
from app.utils.mime import is_pdf, looks_like_pdf
from app.utils.security import pdf_has_javascript


router = APIRouter()


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
        # Converte cada página para imagem (PIL.Image)
        images = convert_from_path(input_path, dpi=dpi)
    except pdf2_exceptions.PDFPageCountError:
        raise HTTPException(status_code=400, detail="PDF inválido ou sem páginas")
    except pdf2_exceptions.PDFInfoNotInstalledError:
        raise HTTPException(status_code=500, detail="Dependência 'poppler' (pdftoppm) não encontrada no servidor")
    except pdf2_exceptions.PDFSyntaxError:
        raise HTTPException(status_code=400, detail="PDF corrompido ou inválido")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao converter PDF: {str(e)}")
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
