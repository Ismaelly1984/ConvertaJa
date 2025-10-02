from __future__ import annotations

import os
import uuid
from typing import List

from pdf2image import convert_from_path
from pypdf import PdfReader
import pytesseract
from PIL import Image


def extract_text_pdf_textual(path: str) -> str:
    reader = PdfReader(path)
    texts: List[str] = []
    for page in reader.pages:
        try:
            t = page.extract_text() or ""
        except Exception:  # noqa: BLE001
            t = ""
        if t:
            texts.append(t)
    return "\n\n".join(texts).strip()


def ocr_pdf_or_image(path: str, langs: List[str]) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        text = extract_text_pdf_textual(path)
        if text:
            return text
        # fallback OCR por imagens
        images = convert_from_path(path, dpi=200)
        langs_tag = "+".join(langs)
        texts: List[str] = []
        for img in images:
            t = pytesseract.image_to_string(img, lang=langs_tag)
            if t:
                texts.append(t)
        return "\n\n".join(texts).strip()
    else:
        langs_tag = "+".join(langs)
        try:
            img = Image.open(path)
        except Exception:
            # Se não conseguir abrir como imagem, retorna vazio
            return ""
        return pytesseract.image_to_string(img, lang=langs_tag)


def save_text(tmp_dir: str, text: str) -> str:
    os.makedirs(tmp_dir, exist_ok=True)
    out = os.path.join(tmp_dir, f"{uuid.uuid4()}.txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)
    return out
