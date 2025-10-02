import React, { useState } from 'react'
import ToolCard from '../components/ToolCard'
import Uploader from '../components/Uploader'
import Toast from '../components/Toast'
import { MergeIcon, SplitIcon, CompressIcon, ImageIcon, OcrIcon } from '../components/Icons'

type Tool = 'merge' | 'split' | 'compress' | 'to-images' | 'ocr'

export default function Home() {
  const [active, setActive] = useState<Tool | null>(null)
  const [toast, setToast] = useState<{type:'success'|'error', message:string}|null>(null)

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

      {active && (
        <section className="max-w-6xl mx-auto px-4 pb-10" aria-label="Painel de Upload">
          <Uploader tool={active} onClose={() => setActive(null)} onToast={setToast} />
        </section>
      )}

      {toast && <Toast type={toast.type} onClose={() => setToast(null)}>{toast.message}</Toast>}
    </main>
  )
}
