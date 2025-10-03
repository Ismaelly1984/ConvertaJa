from __future__ import annotations

import os
from typing import Any, Literal

from app.services.compress_service import Quality, compress_pdf
from app.services.images_service import pdf_to_images
from app.services.merge_service import merge_pdfs
from app.services.ocr_service import ocr_pdf_or_image
from app.services.split_service import split_pdf
from app.utils.files import zip_paths
from app.workers.celery_app import celery


@celery.task(bind=True)
def task_merge(self, tmp_dir: str, inputs: list[str]) -> dict[str, Any]:
    out = os.path.join(tmp_dir, f"job-{self.request.id}.pdf")
    merge_pdfs(inputs, out)
    return {"path": out, "content_type": "application/pdf"}


@celery.task(bind=True)
def task_split(
    self, tmp_dir: str, input_path: str, ranges: list[tuple[int, int]]
) -> dict[str, Any]:
    out_paths = []
    for idx, (_a, _b) in enumerate(ranges, start=1):
        out_paths.append(os.path.join(tmp_dir, f"job-{self.request.id}-{idx}.pdf"))
    res = split_pdf(input_path, ranges, out_paths)
    zip_path = os.path.join(tmp_dir, f"job-{self.request.id}.zip")
    zip_paths(zip_path, res)
    return {"path": zip_path, "content_type": "application/zip"}


@celery.task(bind=True)
def task_compress(self, tmp_dir: str, input_path: str, quality: Quality) -> dict[str, Any]:
    out = os.path.join(tmp_dir, f"job-{self.request.id}.pdf")
    compress_pdf(input_path, out, quality)
    return {"path": out, "content_type": "application/pdf"}


@celery.task(bind=True)
def task_to_images(
    self, tmp_dir: str, input_path: str, fmt: Literal["jpg", "png"], dpi: int
) -> dict[str, Any]:
    out_dir = os.path.join(tmp_dir, f"job-{self.request.id}")
    images = pdf_to_images(input_path, out_dir, fmt, dpi)
    zip_path = os.path.join(tmp_dir, f"job-{self.request.id}.zip")
    zip_paths(zip_path, images)
    return {"path": zip_path, "content_type": "application/zip"}


@celery.task(bind=True)
def task_ocr(self, tmp_dir: str, input_path: str, langs: list[str]) -> dict[str, Any]:
    text = ocr_pdf_or_image(input_path, langs)
    out = os.path.join(tmp_dir, f"job-{self.request.id}.txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)
    return {"path": out, "content_type": "text/plain"}
