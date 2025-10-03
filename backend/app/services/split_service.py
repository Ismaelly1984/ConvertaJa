from __future__ import annotations

from pypdf import PdfReader, PdfWriter


def split_pdf(path: str, ranges: list[tuple[int, int]], out_paths: list[str]) -> list[str]:
    reader = PdfReader(path)
    total = len(reader.pages)
    assert len(ranges) == len(out_paths)
    result: list[str] = []
    for (start, end), out_path in zip(ranges, out_paths, strict=True):
        writer = PdfWriter()
        # convert 1-based inclusive to 0-based
        for i in range(start - 1, min(end, total)):
            writer.add_page(reader.pages[i])
        with open(out_path, "wb") as f:
            writer.write(f)
        result.append(out_path)
    return result
