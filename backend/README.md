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

