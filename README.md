ConvertaJá — Conversor e Ferramentas de PDF Online

[![CI](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/ci.yml/badge.svg)](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/ci.yml)
[![Pages](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/pages/pages-build-deployment)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fismaelly1984.github.io%2FConvertaJa)](https://ismaelly1984.github.io/ConvertaJa)

Resumo
- MVP completo para conversão/manipulação de PDFs: unir, dividir, comprimir, PDF→imagens e OCR (pt-BR/en).
- Backend: FastAPI + Celery/Redis para jobs pesados (compressão, OCR, pdf→imagens).
- Frontend: React + Vite + Tailwind com upload, fila local, progresso, toasts e PWA básico.
- Infra: Docker + docker-compose (api, worker, redis). Testes com pytest/httpx; CI GitHub Actions.

Decisões de MVP (simplicidade/robustez)
- Compressão via Ghostscript (gs) com mapeamento simples de `quality` para DPI/Downsampling. QPDF pode ser usado como alternativa, mas mantido fora por simplicidade.
- Validação de MIME: checagem por `Content-Type` e extensão, priorizando segurança simples. Para produção, considere `python-magic`/libmagic.
- Rate limit: implementação em memória (60 req/10 min por IP). Para múltiplas réplicas, usar Redis.
- Limite de upload: verificação por `Content-Length` e validação por tamanho do arquivo em disco após upload.
- Limpeza de arquivos temporários: thread em background no API que remove arquivos antigos (> TTL_UPLOAD_MINUTES). Worker também expõe utilitário de limpeza.
- Jobs assíncronos: quando `ASYNC_JOBS=true`, endpoints de jobs retornam `jobId` e status/resultado via Celery/Redis.
- S3/Stripe/JWT: mantidos atrás de flags (não habilitados por padrão), apenas pontos de extensão comentados no código.

Como rodar localmente (sem Docker)
1) Backend
   - Requisitos do sistema: Ghostscript (`gs`), Poppler (`pdftoppm`), Tesseract (+ pacotes de idioma `por` e `eng`).
   - Python 3.11+
   - Instale deps:
     - Dev/Test: `pip install -r converta-ja/backend/requirements-dev.txt`
     - Runtime: `pip install -r converta-ja/backend/requirements.txt`
   - Exporte variáveis (ver `.env.example` em README desta pasta):
     - PORT=8000, MAX_FILE_MB=25, ASYNC_JOBS=true, REDIS_URL=redis://localhost:6379/0, TMP_DIR=/tmp/convertaja, TTL_UPLOAD_MINUTES=30, OCR_LANGS=por,eng
   - Rode Redis local.
   - API: `uvicorn app.main:app --reload --port 8000 --host 0.0.0.0` (no diretório `converta-ja/backend`).
   - Worker: `celery -A app.workers.celery_app.celery worker -l info`.

2) Frontend
   - Node 18+
   - `cd converta-ja/frontend && npm install`
   - `npm run dev` (Vite) — base URL configurada por `VITE_API_BASE_URL`.

Como rodar com Docker
- `docker compose -f converta-ja/docker/docker-compose.yml up --build`
- Sobe serviços: `api`, `worker`, `redis`. Volume temporário em `/tmp/convertaja` com limpeza automática por TTL.

Testes
- Backend: `cd converta-ja/backend && pytest -q`.
- Cobertura esperada (services): >= 85% (indicativa no MVP; aumente conforme evolui).
- E2E Frontend (Playwright): placeholder a ser adicionado em iteração futura.

CI/CD
- Workflow: `.github/workflows/ci.yml` (GitHub Actions)
  - Backend (pytest): instala deps nativas, faz lint (ruff), format check (black) e executa testes com cobertura (artefato `backend-coverage-xml`).
  - Frontend (Vite): instala deps, roda ESLint e `npm run build` (artefato `frontend-dist`).
  - Deploy GitHub Pages (main): publica o conteúdo de `frontend/dist` gerado pelo job de frontend.
  - Publicação de imagens Docker (GHCR, main): constrói e publica imagens do backend.

- Habilitar GitHub Pages
  - No GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions.
  - Faça push na branch `main`; o job `deploy_frontend` publicará o site.

- Imagens no GHCR
  - Tags geradas (minúsculas, exigência do GHCR):
    - API: `ghcr.io/ismaelly1984/convertaja-api:latest` e `ghcr.io/ismaelly1984/convertaja-api:<git_sha>`
    - Worker: `ghcr.io/ismaelly1984/convertaja-worker:latest` e `ghcr.io/ismaelly1984/convertaja-worker:<git_sha>`
  - Como puxar (exemplo): `docker pull ghcr.io/ismaelly1984/convertaja-api:latest`

API — Endpoints principais
- POST `/api/pdf/merge` → PDF unido (attachment `merged.pdf`).
- POST `/api/pdf/split` (file + `ranges`) → ZIP com PDFs por intervalo.
- POST `/api/pdf/compress` (file + `quality` low|medium|high) → PDF comprimido. Mapeamento:
  - low: 72–96 DPI (máxima compressão)
  - medium: 150–200 DPI (balanceado)
  - high: 220–300 DPI (menos perda)
- POST `/api/pdf/to-images` (file + `format` jpg|png + `dpi`) → ZIP com `p{num}.{ext}`.
- POST `/api/ocr` (file PDF/Imagem + `lang` por|eng|por+eng) → `{ text }`; download em `/api/ocr/download/{id}`.

Jobs (quando ASYNC_JOBS=true)
- POST `/api/jobs` → `{ jobId }`.
- GET `/api/jobs/{jobId}` → status/progress/resultUrl.
- GET `/api/jobs/{jobId}/download` → binário.

Segurança & Privacidade
- CSP rigorosa por headers. `style-src 'unsafe-inline'` temporário para Tailwind JIT.
- Uploads em `/tmp/convertaja`, nomeados por UUID, TTL de 30 min.
- Rate limiting por IP (60 req/10 min). CORS restrito ao domínio do frontend.
- Logs com `requestId`, duração, tamanho processado e mascaramento simples de PII.

Roadmap (pós-MVP)
- Armazenamento S3 para resultados grandes.
- Login/JWT + Stripe para plano Premium.
- E2E com Playwright e perfis Lighthouse 90+.
