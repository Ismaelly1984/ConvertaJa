import React, { useEffect, useState } from 'react'
import './App.css'
import Uploader from './components/Uploader'
import Toast from './components/Toast'

type Tool = 'merge' | 'split' | 'compress' | 'to-images' | 'ocr'

const MergeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 3v6c0 2.8 2.2 5 5 5h5"/>
    <path d="M7 21V3"/>
    <path d="M16 7l3 3-3 3"/>
  </svg>
)

const SplitIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 5l5 5-5 5"/>
    <path d="M17 5l-5 5 5 5"/>
  </svg>
)

const CompressIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 3h8"/>
    <path d="M12 7v10"/>
    <path d="M9 10l3-3 3 3"/>
    <path d="M9 14l3 3 3-3"/>
  </svg>
)

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 17l-5-5-4 4-2-2-7 7"/>
  </svg>
)

const OcrIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 4h5v2H6v3H4V4zM20 4h-5v2h3v3h2V4zM4 20h5v-2H6v-3H4v5zM20 20h-5v-2h3v-3h2v5z"/>
    <path d="M9 15c0-2.2 1.8-4 4-4 1.5 0 2.8.8 3.4 2"/>
    <path d="M16 15c0 2.2-1.8 4-4 4-1.5 0-2.8-.8-3.4-2"/>
  </svg>
)

const features: { key: Tool; title: string; desc: string; Icon: React.FC }[] = [
  { key: 'merge', title: 'Unir PDFs', desc: 'Combine vários PDFs na ordem desejada', Icon: MergeIcon },
  { key: 'split', title: 'Dividir PDF', desc: 'Separe páginas por intervalos: 1-3,5,7-8', Icon: SplitIcon },
  { key: 'compress', title: 'Comprimir PDF', desc: 'Reduza o tamanho do PDF (low/medium/high)', Icon: CompressIcon },
  { key: 'to-images', title: 'PDF → Imagens', desc: 'Gere PNG por página no DPI desejado', Icon: ImageIcon },
  { key: 'ocr', title: 'OCR', desc: 'Extraia texto de PDF/Imagem (pt-BR/en)', Icon: OcrIcon },
]

export default function App() {
  const [active, setActive] = useState<Tool | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function openTool(tool: Tool) {
    setActive(tool)
    // Dispara evento para integração externa (opcional)
    window.dispatchEvent(new CustomEvent('converta:open-tool', { detail: { tool } }))
  }

  useEffect(() => {
    function onOpen(ev: Event) {
      const e = ev as CustomEvent<{ tool: Tool }>
      if (e?.detail?.tool) setActive(e.detail.tool)
    }
    window.addEventListener('converta:open-tool', onOpen as EventListener)
    return () => window.removeEventListener('converta:open-tool', onOpen as EventListener)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(null)
    }
    if (active) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <div className="app-root">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container nav-inner">
          <a className="brand" href="#" aria-label="ConvertaJá Home">
            <span className="brand-mark" />
            <span className="brand-text">ConvertaJá</span>
          </a>
          <div className="nav-actions">
            <button className="btn btn-ghost">Login</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="container hero-inner">
          <h1 className="hero-title">ConvertaJá — Ferramentas de PDF Simples e Rápidas</h1>
          <p className="hero-subtitle">Unir, Dividir, Comprimir, Converter para Imagens e OCR (pt-BR/EN) — até 25MB grátis</p>
        </div>
      </header>

      {/* Features */}
      <main className="surface">
        <div className="container grid">
          {features.map(({ key, title, desc, Icon }) => (
            <section key={key} className="card" aria-label={title}>
              <div className="card-head">
                <div className="icon-circle">
                  <span className="icon">
                    <Icon />
                  </span>
                </div>
                <div>
                  <h3 className="card-title">{title}</h3>
                  <p className="card-desc">{desc}</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => openTool(key)} aria-label={`Abrir ${title}`}>
                Abrir
                <span className="arrow" aria-hidden>→</span>
              </button>
            </section>
          ))}
        </div>
      </main>

      {/* Modal Uploader */}
      {active && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Uploader"
          onClick={(e) => { if (e.target === e.currentTarget) setActive(null) }}
        >
          <button className="modal-close" onClick={() => setActive(null)} aria-label="Fechar modal">×</button>
          <div className="modal" tabIndex={-1}>
            <div className="modal-card">
              <Uploader tool={active} onClose={() => setActive(null)} onToast={setToast} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast type={toast.type} onClose={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <small>©2025 ConvertaJá</small>
          <small>Feito com ♥</small>
        </div>
      </footer>
    </div>
  )
}
