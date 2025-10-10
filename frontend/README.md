Frontend — ConvertaJá

Stack
- React + Vite + TypeScript + TailwindCSS
- PWA básico: manifest + service worker simples (cache estático e fallback)

Scripts
- `npm run dev` — inicia Vite
- `npm run build` — build produção
- `npm run preview` — pré-visualização

Saída de build
- O build é gerado em `dist/`.
- O diretório `dist/` não é versionado (está no `.gitignore`).
- Para pré-visualizar o build localmente: `npm run preview`.
- O CI (GitHub Actions) faz upload do `dist/` como artefato e pode publicar no GitHub Pages (quando habilitado).

Env
- `VITE_API_BASE_URL` — URL da API (ex.: `http://localhost:8000` para dev, ou o domínio de produção)
- `VITE_CONNECT_SRC` — diretivas permitidas de `connect-src` na CSP. Já existem presets:
  - `.env.development`: `'self' https://converta-api.onrender.com http://localhost:8000`
  - `.env.production`: `'self' https://converta-api.onrender.com`

Base do site
- Em `vite.config.ts`, `base: '/ConvertaJa/'` para hospedar no GitHub Pages em `/ConvertaJa/`.

PWA / Service Worker
- O registro do Service Worker é feito dentro do bundle (veja `src/main.tsx`).
  - Só registra fora de `localhost`/`127.0.0.1`.
  - Usa `import.meta.env.BASE_URL` para respeitar o subcaminho `/ConvertaJa/` no Pages.
- O SW (em `public/sw.js`) implementa strategy network-first para o `index.html` e cache-first para estáticos.

Content Security Policy (CSP)
- A CSP do frontend é aplicada via meta tag no `index.html` e é rígida:
  - `default-src 'self'`; `script-src 'self' 'sha256-<hash-jsonld>'`; `style-src 'self' 'unsafe-inline'`;
  - `img-src 'self' data: blob:`; `font-src 'self' data:`; `object-src 'none'`; `frame-ancestors 'none'`;
  - `connect-src` vem de `VITE_CONNECT_SRC` por ambiente (dev vs prod).
- Hash automático do JSON‑LD: um plugin do Vite (`jsonld-csp-hash`) calcula o SHA‑256 do bloco JSON‑LD inline e substitui o placeholder `'sha256-__JSONLD_HASH__'` na CSP durante o build. Assim, não é necessário recalcular manualmente.
- Atenção: se editar o bloco JSON‑LD inline, o build recalcula o hash. Em produção (GitHub Pages), confirme que o `dist/index.html` contém `script-src` com o hash atualizado.

Troubleshooting
- Atualização não aparece no Pages: Service Worker pode servir versão antiga. Em DevTools → Application → Service Workers → “Unregister” e recarregue, ou faça um hard refresh (Ctrl/Cmd+Shift+R).
- Erro de CSP no console: valide se `connect-src` permite seu domínio de API (veja `.env.*`) e se o hash do JSON‑LD está presente em `script-src` (o build deve injetar automaticamente).
- API bloqueada por CORS: garanta que o backend inclua o domínio do frontend em `CORS_ORIGINS` e que o navegador está chamando a URL correta (`VITE_API_BASE_URL`).
- Ícones PWA ausentes: confirme `public/icons/icon-192.png`, `icon-512.png` e `apple-touch-icon.png`.

Checklist de Release
- Atualize `.env.production` se o domínio da API mudar.
- Rode `npm run build` e verifique no `dist/index.html`:
  - meta CSP com `connect-src` correto e hash em `script-src`.
  - JSON‑LD inline presente.
  - Script do SW não-inline (registro é interno ao bundle).
- Faça o deploy do `dist/` (CI do Pages) e teste funções principais: merge, split, compress, to-images e ocr.
