import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  build: {
    // pdfmake, its fonts and SheetJS are large but only loaded on demand (dynamic import).
    chunkSizeWarningLimit: 1100,
  },
})
