import React from 'react'
import ReactDOM from 'react-dom/client'
import Redesign from './pages/Redesign'
import { I18nProvider } from './i18n/I18nProvider'
import './styles/tailwind.css'

// Frame-buster (mitiga cliquejacking quando servido sem headers CSP no Pages)
if (window.top !== window.self) {
  try { window.top!.location.href = window.location.href } catch { /* noop */ }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <Redesign />
    </I18nProvider>
  </React.StrictMode>
)

// Registra o Service Worker em produção (fora de localhost)
if (
  'serviceWorker' in navigator &&
  !['localhost', '127.0.0.1'].includes(location.hostname)
) {
  window.addEventListener('load', () => {
    const scopeBase = import.meta.env.BASE_URL || '/'
    navigator.serviceWorker
      .register(scopeBase + 'sw.js')
      .then((reg) => console.log('Service Worker registrado:', reg.scope))
      .catch((err) => console.warn('Falha no Service Worker:', err))
  })
}
