import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { solverClient } from './app/solverClient'

solverClient.start()

// Once the page is idle, load the export code (PDF engine, fonts, SheetJS) so
// downloads keep working even if the connection drops later.
const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000))
idle(() => {
  void import('./lib/export/pdf').then((m) => m.preloadPdf())
  void import('./lib/export/bundle')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
