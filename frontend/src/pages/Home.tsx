import React, { useState } from 'react'
import ToolCard from '../components/ToolCard'
import Toast from '../components/Toast'
import { MergeIcon, SplitIcon, CompressIcon, ImageIcon, OcrIcon } from '../components/Icons'
import Modal, { Task as ModalTask } from '../components/Modal'
import { api } from '../lib/api'

type Tool = 'merge' | 'split' | 'compress' | 'to-images' | 'ocr'

export default function Home() {
  const [active, setActive] = useState<Tool | null>(null)
  const [toast, setToast] = useState<{type:'success'|'error', message:string}|null>(null)
  const [mergeTasks, setMergeTasks] = useState<ModalTask[]>([])
  const [splitTasks, setSplitTasks] = useState<ModalTask[]>([])
  const [compressTasks, setCompressTasks] = useState<ModalTask[]>([])
  const [imagesTasks, setImagesTasks] = useState<ModalTask[]>([])
  const [ocrTasks, setOcrTasks] = useState<ModalTask[]>([])

  type SendPayload = { files: File[]; ranges?: string; quality?: 'low'|'medium'|'high'; format?: 'jpg'|'png'; dpi?: number; lang?: string }

  const titles: Record<Tool, string> = {
    merge: 'Unir PDFs',
    split: 'Dividir PDF',
    compress: 'Comprimir PDF',
    'to-images': 'PDF → Imagens',
    ocr: 'OCR',
  }

  async function handleMergeSend(payload: SendPayload) {
    if (!payload.files || payload.files.length < 2) { setToast({ type: 'error', message: 'Selecione pelo menos 2 PDFs.' }); return }
    const t: ModalTask = { id: `${Date.now()}`, fileName: payload.files.map(f=>f.name).join(', '), tool: titles.merge, status: 'processing', progress: 10 }
    setMergeTasks(prev => [t, ...prev])
    try {
      const res = await api.merge(payload.files)
      t.progress = 60; setMergeTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      const ct = (res.headers.get('content-type')||'').toLowerCase()
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      if (!(ct.includes('application/pdf')||ct.includes('application/octet-stream'))) throw new Error('Resposta do servidor não é um PDF esperado.')
      const blob = await res.blob(); t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setMergeTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setMergeTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro na tarefa' })
    }
  }
  function handleMergeDownload(task: { downloadUrl?: string }) { if (!task.downloadUrl) return; const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'merged.pdf'; a.click() }

  async function handleSplitSend(payload: SendPayload) {
    const file = payload.files?.[0]; if (!file) { setToast({ type: 'error', message: 'Selecione um PDF.' }); return }
    if (!payload.ranges?.trim()) { setToast({ type: 'error', message: 'Informe os intervalos (ex: 1-3,5,7-8).' }); return }
    const t: ModalTask = { id: `${Date.now()}`, fileName: file.name, tool: titles.split, status: 'processing', progress: 10 }
    setSplitTasks(prev => [t, ...prev])
    try {
      const res = await api.split(file, payload.ranges!)
      t.progress = 60; setSplitTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      const ct = (res.headers.get('content-type')||'').toLowerCase()
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      if (!(ct.includes('application/zip')||ct.includes('application/octet-stream'))) throw new Error('Resposta do servidor não é um ZIP esperado.')
      const blob = await res.blob(); t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setSplitTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setSplitTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro na tarefa' })
    }
  }
  function handleSplitDownload(task: { downloadUrl?: string }) { if (!task.downloadUrl) return; const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'split.zip'; a.click() }

  async function handleCompressSend(payload: SendPayload) {
    const file = payload.files?.[0]; if (!file) { setToast({ type: 'error', message: 'Selecione um PDF.' }); return }
    const q = payload.quality || 'medium'
    const t: ModalTask = { id: `${Date.now()}`, fileName: file.name, tool: titles.compress, status: 'processing', progress: 10 }
    setCompressTasks(prev => [t, ...prev])
    try {
      const res = await api.compress(file, q)
      t.progress = 60; setCompressTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      const ct = (res.headers.get('content-type')||'').toLowerCase()
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      if (!(ct.includes('application/pdf')||ct.includes('application/octet-stream'))) throw new Error('Resposta do servidor não é um PDF esperado.')
      const blob = await res.blob(); t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setCompressTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setCompressTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro na tarefa' })
    }
  }
  function handleCompressDownload(task: { downloadUrl?: string }) { if (!task.downloadUrl) return; const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'compressed.pdf'; a.click() }

  async function handleImagesSend(payload: SendPayload) {
    const file = payload.files?.[0]; if (!file) { setToast({ type: 'error', message: 'Selecione um PDF.' }); return }
    const fmt = payload.format || 'jpg'; const dpi = payload.dpi || 150
    const t: ModalTask = { id: `${Date.now()}`, fileName: file.name, tool: titles['to-images'], status: 'processing', progress: 10 }
    setImagesTasks(prev => [t, ...prev])
    try {
      const res = await api.toImages(file, fmt, dpi)
      t.progress = 60; setImagesTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      const ct = (res.headers.get('content-type')||'').toLowerCase()
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      if (!(ct.includes('application/zip')||ct.includes('application/octet-stream'))) throw new Error('Resposta do servidor não é um ZIP esperado.')
      const blob = await res.blob(); t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setImagesTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setImagesTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro na tarefa' })
    }
  }
  function handleImagesDownload(task: { downloadUrl?: string }) { if (!task.downloadUrl) return; const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'images.zip'; a.click() }

  async function handleOcrSend(payload: SendPayload) {
    const file = payload.files?.[0]; if (!file) { setToast({ type: 'error', message: 'Selecione um arquivo PDF/Imagem.' }); return }
    const lg = payload.lang || 'por'
    const t: ModalTask = { id: `${Date.now()}`, fileName: file.name, tool: titles.ocr, status: 'processing', progress: 10 }
    setOcrTasks(prev => [t, ...prev])
    try {
      const res = await api.ocr(file, lg)
      t.progress = 60; setOcrTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      const ct = (res.headers.get('content-type')||'').toLowerCase()
      if (!res.ok) {
        let message = `Erro ${res.status}`
        try {
          if (ct.includes('application/json')) { const data: { error?: string; message?: string } = await res.json(); message = data?.error || data?.message || message }
          else { const text = await res.text(); if (text) message = text.slice(0, 200) }
        } catch {}
        throw new Error(message)
      }
      const data: { text?: string } = await res.json()
      const blob = new Blob([data.text ?? ''], { type: 'text/plain' })
      t.downloadUrl = URL.createObjectURL(blob)
      t.status = 'done'; t.progress = 100; setOcrTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'success', message: 'Tarefa concluída' })
    } catch (e: unknown) {
      t.status = 'error'; t.progress = 100; setOcrTasks(prev=> prev.map(x=> x.id===t.id?{...t}:x))
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro na tarefa' })
    }
  }
  function handleOcrDownload(task: { downloadUrl?: string }) { if (!task.downloadUrl) return; const a = document.createElement('a'); a.href = task.downloadUrl; a.download = 'ocr.txt'; a.click() }

  return (
    <main className="relative">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brandIndigo to-brandViolet">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-white">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-sm">
            ConvertaJá — Ferramentas de PDF Simples e Rápidas
          </h1>
          <p className="mt-4 text-white/90 text-lg">
            Unir, Dividir, Comprimir, Converter para Imagens e OCR (pt-BR/EN) — até 25MB grátis
          </p>
        </div>
        <div className="h-6 bg-gradient-to-b from-transparent to-white/90" />
      </section>

      {/* Tools Grid on White Surface */}
      <section aria-label="Ferramentas" className="relative -mt-6 bg-white">
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ToolCard title="Unir PDFs" description="Combine vários PDFs na ordem desejada" onOpen={() => setActive('merge')} icon={<MergeIcon className="h-5 w-5" />} />
            <ToolCard title="Dividir PDF" description="Separe páginas por intervalos: 1-3,5,7-8" onOpen={() => setActive('split')} icon={<SplitIcon className="h-5 w-5" />} />
            <ToolCard title="Comprimir PDF" description="Reduza o tamanho do PDF (low/medium/high)" onOpen={() => setActive('compress')} icon={<CompressIcon className="h-5 w-5" />} />
            <ToolCard title="PDF → Imagens" description="Gere JPG/PNG por página no DPI desejado" onOpen={() => setActive('to-images')} icon={<ImageIcon className="h-5 w-5" />} />
            <ToolCard title="OCR" description="Extraia texto de PDF/Imagem (pt-BR/en)" onOpen={() => setActive('ocr')} icon={<OcrIcon className="h-5 w-5" />} />
          </div>
        </div>
      </section>

      {/* Nova modal por ferramenta */}
      {active === 'merge' && (
        <Modal isOpen title={titles.merge} tool="merge" onClose={() => setActive(null)} onSend={handleMergeSend} tasks={mergeTasks} onDownload={handleMergeDownload} />
      )}
      {active === 'split' && (
        <Modal isOpen title={titles.split} tool="split" onClose={() => setActive(null)} onSend={handleSplitSend} tasks={splitTasks} onDownload={handleSplitDownload} />
      )}
      {active === 'compress' && (
        <Modal isOpen title={titles.compress} tool="compress" onClose={() => setActive(null)} onSend={handleCompressSend} tasks={compressTasks} onDownload={handleCompressDownload} />
      )}
      {active === 'to-images' && (
        <Modal isOpen title={titles['to-images']} tool="to-images" onClose={() => setActive(null)} onSend={handleImagesSend} tasks={imagesTasks} onDownload={handleImagesDownload} />
      )}
      {active === 'ocr' && (
        <Modal isOpen title={titles.ocr} tool="ocr" onClose={() => setActive(null)} onSend={handleOcrSend} tasks={ocrTasks} onDownload={handleOcrDownload} />
      )}

      {toast && <Toast type={toast.type} onClose={() => setToast(null)}>{toast.message}</Toast>}
    </main>
  )
}
