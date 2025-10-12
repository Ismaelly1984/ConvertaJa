from __future__ import annotations

import subprocess
from typing import Literal

from app.config import get_settings

Quality = Literal["low", "medium", "high"]


def _gs_params_for_quality(q: Quality) -> list[str]:
    # Mapeamento simples de downsampling
    if q == "low":
        dpi = 96
        qfactor = 0.5
    elif q == "medium":
        dpi = 150
        qfactor = 0.7
    else:  # high
        dpi = 220
        qfactor = 0.85

    return [
        "-dPDFSETTINGS=/screen",  # ponto de partida
        "-dColorImageDownsampleType=/Bicubic",
        f"-dColorImageResolution={dpi}",
        "-dGrayImageDownsampleType=/Bicubic",
        f"-dGrayImageResolution={dpi}",
        "-dMonoImageDownsampleType=/Subsample",
        f"-dMonoImageResolution={dpi}",
        "-dColorImageFilter=/DCTEncode",
        "-dAutoFilterColorImages=true",
        "-dAutoFilterGrayImages=true",
        f"-dJPEGQ={int(qfactor * 100)}",
    ]


def compress_pdf(input_path: str, output_path: str, quality: Quality) -> str:
    args = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dNOPAUSE",
        "-dSAFER",
        "-dQUIET",
        "-dBATCH",
    ]
    args += _gs_params_for_quality(quality)
    args += ["-sOutputFile=" + output_path, input_path]
    try:
        proc = subprocess.run(
            args, capture_output=True, check=False, timeout=get_settings().GS_TIMEOUT_SECONDS
        )
    except subprocess.TimeoutExpired as err:
        raise RuntimeError("Ghostscript excedeu o tempo limite (timeout)") from err
    if proc.returncode != 0:
        raise RuntimeError(f"Ghostscript falhou: {proc.stderr.decode(errors='ignore')}")
    return output_path
