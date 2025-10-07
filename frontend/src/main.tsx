import React from 'react'
import ReactDOM from 'react-dom/client'
import Redesign from './pages/Redesign'
import { I18nProvider } from './i18n/I18nProvider'
import './styles/tailwind.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <Redesign />
    </I18nProvider>
  </React.StrictMode>
)
