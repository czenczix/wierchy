import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// HashRouter trzyma ścieżkę po znaku # w adresie (np. /#/mapa).
// Dzięki temu apka działa na zwykłym hostingu plików statycznych, bez konfiguracji serwera.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
