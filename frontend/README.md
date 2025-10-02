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
- `VITE_API_BASE_URL=http://localhost:8000`
