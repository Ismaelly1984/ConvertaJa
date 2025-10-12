# Backend — ConvertaJá

## Sumário
- [Variáveis de ambiente (exatas)](#variaveis-de-ambiente-exatas)
- [Comandos úteis](#comandos-uteis)
- [Instalação](#instalacao)
- [Testes](#testes)
- [Segurança — Diretrizes](#seguranca-diretrizes)
- [CORS & CSP](#cors-csp)
- [Nginx (edge) — Produção](#nginx-edge-producao)
- [Observações de proxy](#observacoes-de-proxy)

<a id="variaveis-de-ambiente-exatas"></a>
## Variáveis de ambiente (exatas)
- PORT=8000
- ENV=production
- MAX_FILE_MB=25
- ASYNC_JOBS=true
- REDIS_URL=redis://redis:6379/0
- TMP_DIR=/tmp/convertaja
- TTL_UPLOAD_MINUTES=30
- OCR_LANGS=por,eng
- CORS_ORIGINS=http://localhost:5173
- PDF_TO_IMAGES_MAX_PAGES=200   # máximo de páginas para PDF→imagens
- OCR_MAX_PAGES=50              # máximo de páginas no fallback de OCR por imagens
- GS_TIMEOUT_SECONDS=120        # timeout (s) no Ghostscript na compressão
- MAX_DPI_TO_IMAGES=300         # DPI máximo permitido em PDF→imagens

<a id="comandos-uteis"></a>
## Comandos úteis
- API local: `uvicorn app.main:app --reload --port $PORT --host 0.0.0.0`
- Worker: `celery -A app.workers.celery_app.celery worker -l info`
- Testes: `pytest -q`

<a id="instalacao"></a>
## Instalação
- Dependências nativas (para PDF/OCR):
  - Debian/Ubuntu: `sudo apt-get install -y ghostscript poppler-utils tesseract-ocr tesseract-ocr-por tesseract-ocr-eng qpdf`
  - macOS (Homebrew): `brew install ghostscript poppler tesseract qpdf`

- Ambiente Python (desenvolvimento/testes):
  - `cd backend`
  - `python -m venv .venv && source .venv/bin/activate`
  - `pip install -r requirements-dev.txt`

- Ambiente Python (produção/containers):
  - Instale apenas dependências de runtime: `pip install -r requirements.txt`

<a id="testes"></a>
## Testes
- Rodar: `pytest` ou `pytest -q`
- Cobertura: `pytest --cov=app --cov-report=term-missing`

<a id="seguranca-diretrizes"></a>
## Segurança — Diretrizes
- Limites de upload: por arquivo (`MAX_FILE_MB`) e validações por rota. `413` quando exceder.
- Varredura simples de PDFs com JS/ações (`/JavaScript`, `/JS`) e bloqueio com `415`.
- Ghostscript executado com `-dSAFER` na compressão.
- Limites adicionais para evitar exaustão de recursos:
  - PDF→imagens: até `PDF_TO_IMAGES_MAX_PAGES` páginas (padrão 200); excedendo retorna `413`.
  - OCR (fallback por imagens): até `OCR_MAX_PAGES` páginas (padrão 50).
  - Ghostscript: timeout de `GS_TIMEOUT_SECONDS` (padrão 120s).
  - DPI máximo em PDF→imagens: `MAX_DPI_TO_IMAGES` (padrão 300); acima retorna `400`.
- Nomes de saída por requisição (UUID) + limpeza pós‑envio e limpeza periódica por TTL em `TMP_DIR`.
- Rate limiting em memória: 60 requisições / 10 minutos por IP (camada de app). Para alta escala, use Redis/Nginx.

<a id="cors-csp"></a>
## CORS & CSP
- CORS é restrito por `CORS_ORIGINS` (lista separada por vírgula). Exemplo produção (GitHub Pages): `CORS_ORIGINS=https://ismaelly1984.github.io`.
- A API adiciona cabeçalho CSP em todas as respostas (ver `app/utils/security.py`). Política base:
  - `default-src 'self'`
  - `script-src 'self'`
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob:`
  - `font-src 'self' data:`
  - `connect-src 'self'`
  - `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`
- Observação: o frontend possui sua própria meta CSP no `index.html` com `connect-src` por ambiente e hash de JSON‑LD calculado no build.

<a id="nginx-edge-producao"></a>
## Nginx (edge) — Produção
- Exemplo em `docker/nginx.conf` inclui:
  - `client_max_body_size 100M` (alinha com limite do app para merges grandes)
  - Cabeçalhos de segurança: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - (Opcional) HSTS: habilite quando houver TLS na borda
- Rate‑limit recomendado no edge (ex.: `limit_req`) para reforço de DoS/burst. Exemplo aplicado no arquivo:
  ```nginx
  # Em http {} (arquivo é incluído como conf.d/default.conf)
  limit_req_zone $binary_remote_addr zone=api_rate:10m rate=5r/s;
  limit_req_status 429;

  server {
    location / {
      # Aplica rate limit por IP: 5 req/s com burst 30. Ajuste conforme necessidade.
      limit_req zone=api_rate burst=30 nodelay;
      proxy_pass http://api:8000;
      ...
    }
  }
  ```
- Observação: atrás de proxies/balanceadores, ajuste `real_ip` se necessário para que `$binary_remote_addr` reflita o IP do cliente. Em ambientes com múltiplos proxies, prefira rate‑limit no edge mais externo.
- Garantir `proxy_set_header X-Real-IP` e `X-Forwarded-For` para logs/limitação; para múltiplos proxies, considere mover o rate‑limit para o edge.

<a id="observacoes-de-proxy"></a>
## Observações de proxy
- Atrás de proxy, o IP do cliente pode ser do balanceador. Não confie em `X-Forwarded-For` fora de redes confiáveis; prefira rate‑limit no Nginx/edge.

## Sobrescrever limites por ambiente (Render/Docker)
### Render (dashboard)
- No serviço "converta-api" → Environment, crie/edite as variáveis:
  - `PDF_TO_IMAGES_MAX_PAGES` (ex.: `300`)
  - `OCR_MAX_PAGES` (ex.: `80`)
  - `GS_TIMEOUT_SECONDS` (ex.: `180`)
- Salve e redeploy/restart para aplicar.

### docker-compose (override local)
Crie `docker-compose.override.yml` ao lado do arquivo base e sobrescreva os envs:

```yaml
version: "3.9"
services:
  api:
    environment:
      PDF_TO_IMAGES_MAX_PAGES: "300"
      OCR_MAX_PAGES: "80"
      GS_TIMEOUT_SECONDS: "180"
  api-test:
    environment:
      PDF_TO_IMAGES_MAX_PAGES: "300"
      OCR_MAX_PAGES: "80"
      GS_TIMEOUT_SECONDS: "180"
```

Suba combinando os arquivos:

```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.override.yml up --build
```

Observação: aumente esses limites com moderação. Valores altos podem permitir abusos (CPU/RAM/tempo) em PDFs complexos.
