# ConvertaJá — Conversor e Ferramentas de PDF Online

## Sumário
- [Resumo](#resumo)
- [Decisões de MVP (simplicidade/robustez)](#decisoes-de-mvp-simplicidaderobustez)
- [Como rodar localmente (sem Docker)](#como-rodar-localmente-sem-docker)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Como rodar com Docker](#como-rodar-com-docker)
- [Nginx como proxy (opcional)](#nginx-como-proxy-opcional)
- [Overrides de ambiente (Docker/Render)](#overrides-de-ambiente-dockerrender)
- [Limite de upload (100MB)](#limite-de-upload-100mb)
- [Testes](#testes)
- [CI/CD](#cicd)
- [Frontend — Observações](#frontend--observacoes)
- [Habilitar GitHub Pages](#habilitar-github-pages)
- [Imagens no GHCR](#imagens-no-ghcr)
- [API — Endpoints principais](#api--endpoints-principais)
- [Jobs (quando ASYNC_JOBS=true)](#jobs-quando-async_jobstrue)
- [Segurança & Privacidade](#seguranca--privacidade)
- [Nginx (edge) — headers de segurança](#nginx-edge--headers-de-seguranca)
- [Roadmap (pós-MVP)](#roadmap-pos-mvp)

[![CI](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/ci.yml/badge.svg)](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/ci.yml)
[![Pages](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/Ismaelly1984/ConvertaJa/actions/workflows/pages/pages-build-deployment)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fismaelly1984.github.io%2FConvertaJa)](https://ismaelly1984.github.io/ConvertaJa)

<a id="resumo"></a>
## Resumo
- MVP completo para conversão/manipulação de PDFs: unir, dividir, comprimir, PDF→imagens e OCR (pt-BR/en).
- Backend: FastAPI + Celery/Redis para jobs pesados (compressão, OCR, pdf→imagens).
- Frontend: React + Vite + Tailwind com upload (drag & drop), barra de progresso, PWA, badge de versão visível e redesign como UI padrão.
- Infra: Docker + docker-compose (api, worker, redis). Testes com pytest/httpx; CI GitHub Actions.

<a id="decisoes-de-mvp-simplicidaderobustez"></a>
## Decisões de MVP (simplicidade/robustez)
- Compressão via Ghostscript (gs) com mapeamento simples de `quality` para DPI/Downsampling. QPDF pode ser usado como alternativa, mas mantido fora por simplicidade.
- Validação de MIME: checagem por `Content-Type` e extensão, priorizando segurança simples. Para produção, considere `python-magic`/libmagic.
- Rate limit: implementação em memória (60 req/10 min por IP). Para múltiplas réplicas, usar Redis.
- Limite de upload: verificação por `Content-Length` e validação por tamanho do arquivo em disco após upload.
- Limpeza de arquivos temporários: thread em background no API que remove arquivos antigos (> TTL_UPLOAD_MINUTES). Worker também expõe utilitário de limpeza.
- Jobs assíncronos: quando `ASYNC_JOBS=true`, endpoints de jobs retornam `jobId` e status/resultado via Celery/Redis.
- S3/Stripe/JWT: mantidos atrás de flags (não habilitados por padrão), apenas pontos de extensão comentados no código.

<a id="como-rodar-localmente-sem-docker"></a>
## Como rodar localmente (sem Docker)

<a id="backend"></a>
### Backend
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

<a id="frontend"></a>
### Frontend
   - Node 18+
   - `cd converta-ja/frontend && npm install`
   - `npm run dev` (Vite) — base URL configurada por `VITE_API_BASE_URL`.

<a id="como-rodar-com-docker"></a>
## Como rodar com Docker
- `docker compose -f converta-ja/docker/docker-compose.yml up --build`
- Sobe serviços: `api`, `worker`, `redis`. Volume temporário em `/tmp/convertaja` com limpeza automática por TTL.

<a id="nginx-como-proxy-opcional"></a>
## Nginx como proxy (opcional)
- Suba com overlay incluindo Nginx em frente à API:
  - `docker compose -f converta-ja/docker/docker-compose.yml -f converta-ja/docker/docker-compose.nginx.yml up --build`
- Acesse via Nginx em `http://localhost:8080` (limite de 100MB no edge conforme `docker/nginx.conf`).

<a id="limite-de-upload-100mb"></a>
## Limite de upload (100MB)
- App: valida uploads e retorna 413 quando excede limites.
  - Por arquivo: `MAX_FILE_MB` (padrão 25MB via env).
  - Para merge: soma dos arquivos ≤ 100MB (lógica no endpoint).
- Proxy (recomendado): aplique o mesmo limite no edge para falhar mais cedo.
  - Nginx (exemplo): use `docker/nginx.conf` com `client_max_body_size 100M;` e encaminhe para `api:8000`.
    - Exemplo de serviço (overlay) no docker-compose:
      - image: nginx:alpine
      - volumes: `./docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro`
      - depends_on: `api`
      - ports: `8080:80`
  - Render: serviços Docker não expõem configuração do proxy gerenciado. Se precisar garantir 100MB no edge,
    rode sua própria camada Nginx (ou aceite a validação na aplicação, que retorna 413 pelo header Content-Length).
  - Observação: ajuste `MAX_FILE_MB` conforme a política desejada, mantendo o total de merge em 100MB.

<a id="testes"></a>
## Testes
- Backend: `cd converta-ja/backend && pytest -q`.
- Cobertura esperada (services): >= 85% (indicativa no MVP; aumente conforme evolui).
- E2E Frontend (Playwright): placeholder a ser adicionado em iteração futura.

<a id="cicd"></a>
## CI/CD
- Workflow: `.github/workflows/ci.yml` (GitHub Actions)
  - Backend (pytest): instala deps nativas, faz lint (ruff), format check (black) e executa testes com cobertura (artefato `backend-coverage-xml`).
  - Frontend (Vite): instala deps, roda ESLint e `npm run build` (artefato `frontend-dist`). O build injeta `VITE_APP_VERSION` no footer da UI.
  - Deploy GitHub Pages (main): publica o conteúdo de `frontend/dist` gerado pelo job de frontend.
  - Publicação de imagens Docker (GHCR, main): constrói e publica imagens do backend.

<a id="frontend--observacoes"></a>
## Frontend — Observações
- UI redesign ativa por padrão.
- Service Worker atualizado com estratégia network-first para `index.html` a fim de evitar conteúdo desatualizado. O registro do SW acontece dentro do bundle (`src/main.tsx`) e respeita `BASE_URL` ao publicar no GitHub Pages.
- Se após deploy o site não refletir a nova UI, force refresh (Ctrl+F5) ou, em DevTools → Application → Service Workers, clique em “Unregister” e recarregue.
- Cliquejacking (GitHub Pages): navegadores ignoram `frame-ancestors` em meta CSP; adicionamos um frame‑buster no bundle (`frontend/src/main.tsx`) para mitigar quando servido pelo Pages. Em produção atrás de um proxy/servidor, prefira usar cabeçalho HTTP CSP, ex. Nginx: `add_header Content-Security-Policy "frame-ancestors 'none'" always;`.
  - Detalhes: veja [Proteção contra cliquejacking (frame‑ancestors)](frontend/README.md#protecao-contra-cliquejacking-frame-ancestors).

<a id="habilitar-github-pages"></a>
## Habilitar GitHub Pages
  - No GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions.
  - Faça push na branch `main`; o job `deploy_frontend` publicará o site.

<a id="imagens-no-ghcr"></a>
## Imagens no GHCR
  - Tags geradas (minúsculas, exigência do GHCR):
    - API: `ghcr.io/ismaelly1984/convertaja-api:latest` e `ghcr.io/ismaelly1984/convertaja-api:<git_sha>`
    - Worker: `ghcr.io/ismaelly1984/convertaja-worker:latest` e `ghcr.io/ismaelly1984/convertaja-worker:<git_sha>`
  - Como puxar (exemplo): `docker pull ghcr.io/ismaelly1984/convertaja-api:latest`

<a id="api--endpoints-principais"></a>
## API — Endpoints principais
- POST `/api/pdf/merge` → PDF unido (attachment `merged.pdf`).
- POST `/api/pdf/split` (file + `ranges`) → ZIP com PDFs por intervalo.
- POST `/api/pdf/compress` (file + `quality` low|medium|high) → PDF comprimido. Mapeamento:
  - low: 72–96 DPI (máxima compressão)
  - medium: 150–200 DPI (balanceado)
  - high: 220–300 DPI (menos perda)
- POST `/api/pdf/to-images` (file + `format` jpg|png + `dpi`) → ZIP com `p{num}.{ext}`.
- POST `/api/ocr` (file PDF/Imagem + `lang` por|eng|por+eng) → `{ text }`; download em `/api/ocr/download/{id}`.

<a id="jobs-quando-async_jobstrue"></a>
## Jobs (quando ASYNC_JOBS=true)
- POST `/api/jobs` → `{ jobId }`.
- GET `/api/jobs/{jobId}` → status/progress/resultUrl.
- GET `/api/jobs/{jobId}/download` → binário.

<a id="seguranca--privacidade"></a>
## Segurança & Privacidade
- CSP rigorosa:
  - Backend: cabeçalho CSP aplicado às respostas da API.
  - Frontend: meta CSP no `index.html` com `script-src` limitado a `'self'` e hash do JSON‑LD inline (gerado automaticamente no build) e `connect-src` restrito por ambiente (`VITE_CONNECT_SRC`).
- Uploads em `/tmp/convertaja`, nomeados por UUID, TTL de 30 min.
- Rate limiting por IP (60 req/10 min). CORS restrito ao domínio do frontend.
- Logs com `requestId`, duração, tamanho processado e mascaramento simples de PII.
- Compressão (Ghostscript) executada com `-dSAFER`.
- Saídas síncronas (merge/split/compress) usam nomes únicos por requisição e limpeza automática pós‑envio.
- Limites de recursos configuráveis por ambiente:
  - `PDF_TO_IMAGES_MAX_PAGES` (padrão 200), `OCR_MAX_PAGES` (padrão 50), `GS_TIMEOUT_SECONDS` (padrão 120).

<a id="nginx-edge--headers-de-seguranca"></a>
## Nginx (edge) — headers de segurança
- `docker/nginx.conf` define:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - (Opcional) HSTS: habilitar quando houver TLS na borda.

<a id="roadmap-pos-mvp"></a>
## Roadmap (pós-MVP)
- Armazenamento S3 para resultados grandes.
- Login/JWT + Stripe para plano Premium.
- E2E com Playwright e perfis Lighthouse 90+.
<a id="overrides-de-ambiente-dockerrender"></a>
## Overrides de ambiente (Docker/Render)
- Docker: use um arquivo de override para ajustar limites/tempo sem alterar o compose base.
  - Exemplo: `docker/docker-compose.override.example.yml` (copie para `docker/docker-compose.override.yml` e edite valores).
  - Suba combinando os arquivos: `docker compose -f docker/docker-compose.yml -f docker/docker-compose.override.yml up --build`.
- Render: defina as variáveis no dashboard do serviço (ex.: `PDF_TO_IMAGES_MAX_PAGES`, `OCR_MAX_PAGES`, `GS_TIMEOUT_SECONDS`).
