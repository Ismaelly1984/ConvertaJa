import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'

function jsonLdCspHash(): Plugin {
  return {
    name: 'jsonld-csp-hash',
    transformIndexHtml(html) {
      try {
        const m = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
        if (!m) return html
        const json = (m[1] || '').trim()
        const hash = createHash('sha256').update(json).digest('base64')
        return html.replace(/'sha256-__JSONLD_HASH__'/g, `'sha256-${hash}'`)
      } catch {
        return html
      }
    },
  }
}

export default defineConfig({
  // Needed for GitHub Pages project site hosting under /ConvertaJa/
  base: '/ConvertaJa/',
  plugins: [react(), jsonLdCspHash()],
  server: {
    port: 5173,
  },
})
