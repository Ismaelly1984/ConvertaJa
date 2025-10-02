Backend — ConvertaJá

Variáveis de ambiente (exatas)
- PORT=8000
- ENV=production
- MAX_FILE_MB=25
- ASYNC_JOBS=true
- REDIS_URL=redis://redis:6379/0
- TMP_DIR=/tmp/convertaja
- TTL_UPLOAD_MINUTES=30
- OCR_LANGS=por,eng
- CORS_ORIGINS=http://localhost:5173

Comandos úteis
- API local: `uvicorn app.main:app --reload --port $PORT --host 0.0.0.0`
- Worker: `celery -A app.workers.celery_app.celery worker -l info`
- Testes: `pytest -q`

Instalação
- Dependências nativas (para PDF/OCR):
  - Debian/Ubuntu: `sudo apt-get install -y ghostscript poppler-utils tesseract-ocr tesseract-ocr-por tesseract-ocr-eng qpdf`
  - macOS (Homebrew): `brew install ghostscript poppler tesseract qpdf`

- Ambiente Python (desenvolvimento/testes):
  - `cd backend`
  - `python -m venv .venv && source .venv/bin/activate`
  - `pip install -r requirements-dev.txt`

- Ambiente Python (produção/containers):
  - Instale apenas dependências de runtime: `pip install -r requirements.txt`

Testes
- Rodar: `pytest` ou `pytest -q`
- Cobertura: `pytest --cov=app --cov-report=term-missing`

