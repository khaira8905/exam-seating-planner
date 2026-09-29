import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `npm run preview` serves the same security headers as production (vercel.json),
// so the Content Security Policy — which blocks any request to another site — is tested locally too.
const vercel = JSON.parse(fs.readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const securityHeaders = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value]))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  preview: { headers: securityHeaders },
  build: {
    // pdfmake, its fonts and SheetJS are large but only loaded on demand (dynamic import).
    chunkSizeWarningLimit: 1100,
  },
})
