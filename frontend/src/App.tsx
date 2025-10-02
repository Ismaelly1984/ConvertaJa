import React, { useEffect, useState } from 'react'
import './App.css'
import Modal from './components/Modal'
import { api } from './lib/api'
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

const features: {
  key: Tool
  title: string
  desc: string
  Icon: React.FC
  cardClass: string
  iconClass: string
}[] = [
  {
    key: 'merge',
    title: 'Unir PDFs',
    desc: 'Combine vários PDFs na ordem desejada',
    Icon: MergeIcon,
    cardClass: 'card card--merge',
    iconClass: 'icon-circle icon-circle--merge',
  },
  {
    key: 'split',
    title: 'Dividir PDF',
    desc: 'Separe páginas por intervalos: 1-3,5,7-8',
    Icon: SplitIcon,
    cardClass: 'card card--split',
    iconClass: 'icon-circle icon-circle--split',
  },
  {
    key: 'compress',
    title: 'Comprimir PDF',
    desc: 'Reduza o tamanho do PDF (low/medium/high)',
    Icon: CompressIcon,
    cardClass: 'card card--compress',
    iconClass: 'icon-circle icon-circle--compress',
  },
  {
    key: 'to-images',
    title: 'PDF → Imagens',
    desc: 'Gere PNG por página no DPI desejado',
    Icon: ImageIcon,
    cardClass: 'card card--to-images',
    iconClass: 'icon-circle icon-circle--to-images',
  },
  {
    key: 'ocr',
    title: 'OCR',
    desc: 'Extraia texto de PDF/Imagem (pt-BR/EN)',
    Icon: OcrIcon,
    cardClass: 'card card--ocr',
    iconClass: 'icon-circle icon-circle--ocr',
  },
]

export default function App() {
  const [active, setActive] = useState<Tool | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [mergeTasks, setMergeTasks] = useState<{
    id: string
    fileName: string
    tool: string
    status: 'processing' | 'done' | 'error'
    progress: number
    downloadUrl?: string
  }[]>([])
  const [splitTasks, setSplitTasks] = useState<{
    id: string
    fileName: string
    tool: string
    status: 'processing' | 'done' | 'error'
    progress: number
    downloadUrl?: string
  }[]>([])
  const [compressTasks, setCompressTasks] = useState<{
    id: string
    fileName: string
    tool: string
    status: 'processing' | 'done' | 'error'
    progress: number
    downloadUrl?: string
  }[]>([])
  const [imagesTasks, setImagesTasks] = useState<{
    id: string
    fileName: string
    tool: string
    status: 'processing' | 'done' | 'error'
    progress: number
    downloadUrl?: string
  }[]>([])
  const [ocrTasks, setOcrTasks] = useState<{
    id: string
    fileName: string
    tool: string
    status: 'processing' | 'done' | 'error'
    progress: number
    downloadUrl?: string
  }[]>([])

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

  type SendPayload = { files: File[]; ranges?: string; quality?: 'low'|'medium'|'high'; format?: 'jpg'|'png'; dpi?: number; lang?: string }

  async function handleSplitSend(payload: SendPayload) {
    const file = payload.files?.[0]
    if (!file) {
      setToast({ type: 'error', message: 'Selecione um PDF.' })
      return
    }
    if (!payload.ranges?.trim()) {
      setToast({ type: 'error', message: 'Informe os intervalos (ex: 1-3,5,7-8).' })
      return
    }
    const t = {
      id: `${Date.now()}`,
      fileName: file.name,
      tool: 'Dividir PDF',
      status: 'processing' as const,
      progress: 10,
    }
    setSplitTasks((prev) => [t, ...prev])
    try {
      const res = await api.split(file, payload.ranges!)
      t.progress = 60
      setSplitTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (!res.ok) {
        let message = `Erro ${res.status}`
        try {
          if (ct.includes('application/json')) {
            const data: { error?: string; message?: string } = await res.json()
            message = data?.error || data?.message || message
          } else {
            const text = await res.text()
            if (text) message = text.slice(0, 200)
          }
        } catch {}
        throw new Error(message)
      }
      const expectZip = ct.includes('application/zip') || ct.includes('application/octet-stream')
      if (!expectZip) throw new Error('Resposta do servidor não é um ZIP esperado.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      t.downloadUrl = url
      t.status = 'done'
      t.progress = 100
      setSplitTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'
      t.progress = 100
      setSplitTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const message = e instanceof Error ? e.message : 'Erro na tarefa'
      setToast({ type: 'error', message })
    }
  }

  function handleSplitDownload(task: { downloadUrl?: string }) {
    if (!task.downloadUrl) return
    const a = document.createElement('a')
    a.href = task.downloadUrl
    a.download = 'split.zip'
    a.click()
  }

  async function handleMergeSend(payload: SendPayload) {
    if (!payload.files || payload.files.length < 2) {
      setToast({ type: 'error', message: 'Selecione pelo menos 2 PDFs.' })
      return
    }
    const t = { id: `${Date.now()}`, fileName: payload.files.map(f=>f.name).join(', '), tool: 'Unir PDFs', status: 'processing' as const, progress: 10 }
    setMergeTasks((prev) => [t, ...prev])
    try {
      const res = await api.merge(payload.files)
      t.progress = 60
      setMergeTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const expectPdf = ct.includes('application/pdf') || ct.includes('application/octet-stream')
      if (!expectPdf) throw new Error('Resposta do servidor não é um PDF esperado.')
      const blob = await res.blob()
      t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100
      setMergeTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100
      setMergeTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const message = e instanceof Error ? e.message : 'Erro na tarefa'
      setToast({ type: 'error', message })
    }
  }

  function handleMergeDownload(task: { downloadUrl?: string }) {
    if (!task.downloadUrl) return
    const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'merged.pdf'; a.click()
  }

  async function handleCompressSend(payload: SendPayload) {
    const file = payload.files?.[0]
    if (!file) { setToast({ type: 'error', message: 'Selecione um PDF.' }); return }
    const q = payload.quality || 'medium'
    const t = { id: `${Date.now()}`, fileName: file.name, tool: 'Comprimir PDF', status: 'processing' as const, progress: 10 }
    setCompressTasks((prev) => [t, ...prev])
    try {
      const res = await api.compress(file, q)
      t.progress = 60; setCompressTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const expectPdf = ct.includes('application/pdf') || ct.includes('application/octet-stream')
      if (!expectPdf) throw new Error('Resposta do servidor não é um PDF esperado.')
      const blob = await res.blob(); t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setCompressTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setCompressTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const message = e instanceof Error ? e.message : 'Erro na tarefa'
      setToast({ type: 'error', message })
    }
  }

  function handleCompressDownload(task: { downloadUrl?: string }) {
    if (!task.downloadUrl) return
    const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'compressed.pdf'; a.click()
  }

  async function handleImagesSend(payload: SendPayload) {
    const file = payload.files?.[0]
    if (!file) { setToast({ type: 'error', message: 'Selecione um PDF.' }); return }
    const fmt = payload.format || 'jpg'; const dpi = payload.dpi || 150
    const t = { id: `${Date.now()}`, fileName: file.name, tool: 'PDF → Imagens', status: 'processing' as const, progress: 10 }
    setImagesTasks((prev) => [t, ...prev])
    try {
      const res = await api.toImages(file, fmt, dpi)
      t.progress = 60; setImagesTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const expectZip = ct.includes('application/zip') || ct.includes('application/octet-stream')
      if (!expectZip) throw new Error('Resposta do servidor não é um ZIP esperado.')
      const blob = await res.blob(); t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setImagesTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setImagesTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const message = e instanceof Error ? e.message : 'Erro na tarefa'
      setToast({ type: 'error', message })
    }
  }

  function handleImagesDownload(task: { downloadUrl?: string }) {
    if (!task.downloadUrl) return
    const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'images.zip'; a.click()
  }

  async function handleOcrSend(payload: SendPayload) {
    const file = payload.files?.[0]
    if (!file) { setToast({ type: 'error', message: 'Selecione um arquivo PDF/Imagem.' }); return }
    const lg = payload.lang || 'por'
    const t = { id: `${Date.now()}`, fileName: file.name, tool: 'OCR', status: 'processing' as const, progress: 10 }
    setOcrTasks((prev) => [t, ...prev])
    try {
      const res = await api.ocr(file, lg)
      t.progress = 60; setOcrTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (!res.ok) {
        let message = `Erro ${res.status}`
        try {
          if (ct.includes('application/json')) {
            const data: { error?: string; message?: string } = await res.json()
            message = data?.error || data?.message || message
          } else {
            const text = await res.text(); if (text) message = text.slice(0, 200)
          }
        } catch {}
        throw new Error(message)
      }
      const data: { text?: string } = await res.json()
      const blob = new Blob([data.text ?? ''], { type: 'text/plain' })
      t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setOcrTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setOcrTasks((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)))
      const message = e instanceof Error ? e.message : 'Erro na tarefa'
      setToast({ type: 'error', message })
    }
  }

  function handleOcrDownload(task: { downloadUrl?: string }) {
    if (!task.downloadUrl) return
    const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'ocr.txt'; a.click()
  }

  return (
    <div className="app-root">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container nav-inner">
          <a className="brand" href="#" aria-label="ConvertaJá Home">
            <span className="brand-mark" />
            <span className="brand-text">ConvertaJá</span>
          </a>
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
      <main className="features">
        <div className="container grid">
          {features.map(({ key, title, desc, Icon, cardClass, iconClass }) => (
            <section key={key} className={cardClass} aria-label={title}>
              <div className="card-head">
                <div className={iconClass}>
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

      {/* Modals by tool */}
      {active === 'merge' && (
        <Modal isOpen title="Unir PDFs" tool="merge" onClose={() => setActive(null)} onSend={handleMergeSend} tasks={mergeTasks} onDownload={handleMergeDownload} />
      )}
      {active === 'split' && (
        <Modal isOpen title="Dividir PDF" tool="split" onClose={() => setActive(null)} onSend={handleSplitSend} tasks={splitTasks} onDownload={handleSplitDownload} />
      )}
      {active === 'compress' && (
        <Modal isOpen title="Comprimir PDF" tool="compress" onClose={() => setActive(null)} onSend={handleCompressSend} tasks={compressTasks} onDownload={handleCompressDownload} />
      )}
      {active === 'to-images' && (
        <Modal isOpen title="PDF → Imagens" tool="to-images" onClose={() => setActive(null)} onSend={handleImagesSend} tasks={imagesTasks} onDownload={handleImagesDownload} />
      )}
      {active === 'ocr' && (
        <Modal isOpen title="OCR" tool="ocr" onClose={() => setActive(null)} onSend={handleOcrSend} tasks={ocrTasks} onDownload={handleOcrDownload} />
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
        </div>
      </footer>
    </div>
  )
}
