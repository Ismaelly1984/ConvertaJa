import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Needed for GitHub Pages project site hosting under /ConvertaJa/
  base: '/ConvertaJa/',
  plugins: [react()],
  server: {
    port: 5173,
  },
})
