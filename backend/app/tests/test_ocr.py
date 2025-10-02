from __future__ import annotations

from app.services.ocr_service import ocr_pdf_or_image


def test_ocr_pdf_textual_returns_text(tmp_path, monkeypatch):
    pdf = tmp_path / "a.pdf"
    pdf.write_bytes(b"%PDF-1.4\n%%EOF\n")

    class FakePage:
        def extract_text(self):
            return "hello"

    class FakeReader:
        def __init__(self, path):  # noqa: ARG002
            self.pages = [FakePage(), FakePage()]

    import app.services.ocr_service as svc

    monkeypatch.setattr(svc, "PdfReader", FakeReader)
    text = ocr_pdf_or_image(str(pdf), ["eng"])  # no ocr needed
    assert "hello" in text


def test_ocr_pdf_scanned_uses_tesseract(tmp_path, monkeypatch):
    pdf = tmp_path / "a.pdf"
    pdf.write_bytes(b"%PDF-1.4\n%%EOF\n")

    class FakePage:
        def extract_text(self):
            return ""

    class FakeReader:
        def __init__(self, path):  # noqa: ARG002
            self.pages = [FakePage()]

    class FakeImage:
        pass

    def fake_convert_from_path(path, dpi=200):  # noqa: ARG001
        return [FakeImage()]

    def fake_ocr(img, lang="eng"):
        return "texto-ocr"

    import app.services.ocr_service as svc

    monkeypatch.setattr(svc, "PdfReader", FakeReader)
    monkeypatch.setattr(svc, "convert_from_path", fake_convert_from_path)
    monkeypatch.setattr(svc.pytesseract, "image_to_string", lambda img, lang=None: fake_ocr(img, lang))

    text = ocr_pdf_or_image(str(pdf), ["por", "eng"])  # triggers OCR
    assert "texto-ocr" in text

