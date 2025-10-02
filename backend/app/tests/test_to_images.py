from __future__ import annotations

import os

from app.services.images_service import pdf_to_images


class FakeImage:
    def __init__(self, idx: int):
        self.idx = idx

    def save(self, path: str, format: str):  # noqa: A003
        with open(path, "wb") as f:
            f.write(b"fakeimg")


def test_pdf_to_images_mocks_pdf2image(tmp_path, monkeypatch):
    input_path = tmp_path / "src.pdf"
    input_path.write_bytes(b"%PDF-1.4\n%%EOF\n")

    def fake_convert_from_path(path, dpi=200):  # noqa: ARG001
        return [FakeImage(1), FakeImage(2)]

    import app.services.images_service as svc

    monkeypatch.setattr(svc, "convert_from_path", fake_convert_from_path)
    out_dir = tmp_path / "out"
    res = pdf_to_images(str(input_path), str(out_dir), "jpg", 150)
    assert len(res) == 2
    for p in res:
        assert os.path.exists(p)

