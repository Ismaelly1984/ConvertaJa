import React, { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import '../styles/redesign.css'
import { api } from '../lib/api'
import { useI18n } from '../i18n/I18nProvider'

type Tool = 'merge' | 'split' | 'compress' | 'images'
type FileLike = File & { name: string; size: number }

export default function Redesign() {
  const { locale } = useI18n()
  // Refs para rolagem e animações de entrada
  const heroRef = useRef<HTMLElement | null>(null)
  const toolsRef = useRef<HTMLElement | null>(null)
  const uploadRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [heroIn, setHeroIn] = useState(false)
  const [toolsIn, setToolsIn] = useState(false)
  const [uploadIn, setUploadIn] = useState(false)
  const [selectedTool, setSelectedTool] = useState<Tool>('merge')
  const [selectedFiles, setSelectedFiles] = useState<FileLike[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState<{ url: string; filename: string } | null>(null)

  // Parâmetros simples
  const [ranges, setRanges] = useState('1-3,5')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [imgFormat, setImgFormat] = useState<'png' | 'jpg'>('png')
  const [dpi, setDpi] = useState(150)

  const t = useMemo(() => ({
    heroTitle: locale === 'pt' ? 'Converta PDFs com rapidez e precisão' : 'Convert PDFs with speed and precision',
    heroSubtitle: locale === 'pt' ? 'Unir, dividir e comprimir seus arquivos em segundos.' : 'Merge, split and compress your files in seconds.',
    cta: locale === 'pt' ? 'Começar agora' : 'Get started',
    toolsTitle: locale === 'pt' ? 'Escolha sua ferramenta' : 'Choose your tool',
    toolCards: {
      merge: locale === 'pt' ? { title: 'Unir PDFs', desc: 'Combine vários PDFs na ordem desejada' } : { title: 'Merge PDFs', desc: 'Combine multiple PDFs in order' },
      split: locale === 'pt' ? { title: 'Dividir PDF', desc: 'Separe páginas por intervalos: 1-3,5,7-8' } : { title: 'Split PDF', desc: 'Extract page ranges: 1-3,5,7-8' },
      compress: locale === 'pt' ? { title: 'Comprimir PDF', desc: 'Reduza o tamanho do PDF rapidamente' } : { title: 'Compress PDF', desc: 'Reduce PDF size quickly' },
      images: locale === 'pt' ? { title: 'PDF → Imagens', desc: 'Exporte PNG por página no DPI desejado' } : { title: 'PDF → Images', desc: 'Export PNG per page at chosen DPI' },
    },
    useBtn: locale === 'pt' ? 'Usar' : 'Use',
    uploadTitle: locale === 'pt' ? 'Solte seu arquivo PDF aqui' : 'Drop your PDF here',
    uploadSubtitle: locale === 'pt' ? 'ou clique para enviar' : 'or click to upload',
    selectFile: locale === 'pt' ? 'Selecionar arquivo' : 'Select file',
    selected: locale === 'pt' ? 'Selecionado' : 'Selected',
    toolSelected: locale === 'pt' ? 'Ferramenta selecionada' : 'Selected tool',
    params: {
      ranges: locale === 'pt' ? 'Intervalos (ex: 1-3,5,7-8)' : 'Ranges (e.g., 1-3,5,7-8)',
      quality: locale === 'pt' ? 'Qualidade' : 'Quality',
      qLow: locale === 'pt' ? 'baixa' : 'low',
      qMedium: locale === 'pt' ? 'média' : 'medium',
      qHigh: locale === 'pt' ? 'alta' : 'high',
      format: locale === 'pt' ? 'Formato' : 'Format',
      dpi: 'DPI',
    },
    process: locale === 'pt' ? 'Processar arquivos' : 'Process Files',
    clear: locale === 'pt' ? 'Limpar' : 'Clear',
    processing: locale === 'pt' ? 'Processando...' : 'Processing...',
    done: locale === 'pt' ? 'Processamento concluído!' : 'Processing complete!',
    download: locale === 'pt' ? 'Baixar arquivo' : 'Download file',
    err: locale === 'pt' ? 'Falha ao processar arquivos. Verifique os parâmetros e tente novamente.' : 'Failed to process files. Check parameters and try again.',
  }), [locale])

  // Estilo tipado para variável CSS do hero (evita any/assertions)
  const base = import.meta.env.BASE_URL || '/'
  type HeroCssVars = { ['--hero-bg-image']: string }
  const heroStyle: React.CSSProperties & HeroCssVars = {
    // Prefer AVIF with JPEG fallback using CSS image-set
    '--hero-bg-image': `image-set(url(${base}hero.avif) type("image/avif") 1x, url(${base}hero.jpg) type("image/jpeg") 1x)`,
  }

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (e.target === heroRef.current) setHeroIn(true)
            if (e.target === toolsRef.current) setToolsIn(true)
            if (e.target === uploadRef.current) setUploadIn(true)
          }
        })
      },
      { threshold: 0.15 }
    )
    if (heroRef.current) io.observe(heroRef.current)
    if (toolsRef.current) io.observe(toolsRef.current)
    if (uploadRef.current) io.observe(uploadRef.current)
    return () => io.disconnect()
  }, [])

  function scrollToTools() {
    toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function useTool(t: Tool) {
    setSelectedTool(t)
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openPicker() {
    fileInputRef.current?.click()
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files) as FileLike[]
    setSelectedFiles(arr)
    setFileName(arr.length === 1 ? arr[0].name : `${arr.length} arquivos`)
    setSuccess(null)
  }

  const canProcess = useMemo(() => {
    if (processing) return false
    if (selectedTool === 'merge') return selectedFiles.length >= 2
    return selectedFiles.length >= 1
  }, [processing, selectedTool, selectedFiles])

  function startProgress() {
    setProcessing(true)
    setProgress(0)
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const next = Math.min(90, 5 + Math.sqrt(elapsed / 6))
      setProgress(next)
    }, 200)
    return () => clearInterval(id)
  }

  async function handleBinary(resp: Response, fallbackName: string) {
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      throw new Error(txt || `Erro ${resp.status}`)
    }
    let filename = fallbackName
    const cd = resp.headers.get('content-disposition') || ''
    const m = /filename="?([^";]+)"?/i.exec(cd)
    if (m?.[1]) filename = m[1]
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    setSuccess({ url, filename })
  }

  async function processFiles() {
    if (!canProcess) return
    const stop = startProgress()
    try {
      let resp: Response
      if (selectedTool === 'merge') {
        resp = await api.merge(selectedFiles)
        await handleBinary(resp, 'merged.pdf')
      } else if (selectedTool === 'split') {
        const file = selectedFiles[0]
        resp = await api.split(file, ranges)
        await handleBinary(resp, 'split.zip')
      } else if (selectedTool === 'compress') {
        const file = selectedFiles[0]
        resp = await api.compress(file, quality)
        await handleBinary(resp, 'compressed.pdf')
      } else {
        const file = selectedFiles[0]
        resp = await api.toImages(file, imgFormat, dpi)
        await handleBinary(resp, 'images.zip')
      }
      setProgress(100)
    } catch (err) {
      console.error(err)
      alert(t.err)
    } finally {
      stop()
      setProcessing(false)
    }
  }

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen">
      {/* Navbar unificada no topo, transparente sobre o gradiente */}
      <Navbar variant="onGradient" />

      {/* Hero */}
      <section
        ref={heroRef}
        className="gradient-bg hero-with-image text-white py-20 relative overflow-hidden"
        role="banner"
        aria-label="Apresentação"
        style={heroStyle}
      >
        <div className="floating-particle" style={{ top: '10%', left: '10%' }} />
        <div className="floating-particle" style={{ top: '20%', right: '15%' }} />
        <div className="floating-particle" style={{ bottom: '30%', left: '20%' }} />
        <div className="floating-particle" style={{ top: '40%', right: '25%' }} />

        <div className="container mx-auto px-6 relative z-10">
          <div className={`max-w-3xl mx-auto text-center transition-all duration-700 ${heroIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-5">{t.heroTitle}</h1>
            <p className="text-lg md:text-xl opacity-90 mb-8">{t.heroSubtitle}</p>
            <button onClick={scrollToTools} className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 rounded-lg font-semibold transition-colors">
              {t.cta}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* Seção de Ferramentas */}
      <section ref={toolsRef} id="tools" className="py-16 content-vis">
        <div className="container mx-auto px-6">
          <div className={`max-w-6xl mx-auto transition-all duration-700 ${toolsIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-3xl font-bold text-center mb-10">{t.toolsTitle}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {([
                { key: 'merge', title: t.toolCards.merge.title, desc: t.toolCards.merge.desc },
                { key: 'split', title: t.toolCards.split.title, desc: t.toolCards.split.desc },
                { key: 'compress', title: t.toolCards.compress.title, desc: t.toolCards.compress.desc },
                { key: 'images', title: t.toolCards.images.title, desc: t.toolCards.images.desc },
              ] as Array<{ key: Tool; title: string; desc: string }>).map(({ key, title, desc }) => (
                <div key={key} className={`tool-card rounded-xl p-6 shadow hover:shadow-lg hover-lift transition-all bg-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <span className="text-slate-400">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6"/></svg>
                    </span>
                  </div>
                  <p className="text-slate-600 mb-5 leading-relaxed">{desc}</p>
                  <button onClick={() => useTool(key)} className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-lg py-2.5 font-medium transition-colors">{t.useBtn}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Área de Upload */}
      <section ref={uploadRef} id="upload" className="py-8">
        <div className="container mx-auto px-6">
          <div className={`max-w-xl mx-auto my-16 transition-all duration-700 ${uploadIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div
              className="upload-zone rounded-xl p-10 text-center cursor-pointer"
              onClick={openPicker}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover') }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); onFiles(e.dataTransfer.files) }}
            >
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-500 motion-safe:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              <h4 className="text-lg font-semibold mb-1">{t.uploadTitle}</h4>
              <p className="text-slate-600 mb-4">{t.uploadSubtitle}</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors">{t.selectFile}</button>
              <input ref={fileInputRef} type="file" accept=".pdf" multiple={selectedTool==='merge'} onChange={(e) => onFiles(e.target.files)} className="hidden" />
              {fileName && (
                <div className="mt-4 text-sm text-slate-700">{t.selected}: <span className="font-medium">{fileName}</span></div>
              )}
              <div className="mt-2 text-xs text-slate-500">{t.toolSelected}: <span className="font-medium">{selectedTool.toUpperCase()}</span></div>
            </div>
            {/* Parâmetros rápidos por ferramenta */}
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTool === 'split' && (
                  <div>
                    <label className="text-sm font-medium">{t.params.ranges}</label>
                    <input value={ranges} onChange={(e) => setRanges(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
                  </div>
                )}
                {selectedTool === 'compress' && (
                  <div>
                    <label className="text-sm font-medium">{t.params.quality}</label>
                    <div className="mt-1 flex gap-3">
                      {(['low', 'medium', 'high'] as const).map((q) => (
                        <label key={q} className="flex items-center gap-1 text-sm">
                          <input type="radio" name="quality" checked={quality === q} onChange={() => setQuality(q)} />
                          {q === 'low' ? t.params.qLow : q === 'medium' ? t.params.qMedium : t.params.qHigh}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTool === 'images' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">{t.params.format}</label>
                      <select value={imgFormat} onChange={(e) => setImgFormat(e.target.value as 'png' | 'jpg')} className="mt-1 w-full border rounded-md px-3 py-2">
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t.params.dpi}</label>
                      <input type="number" min={72} max={600} value={dpi} onChange={(e) => setDpi(parseInt(e.target.value || '150', 10))} className="mt-1 w-full border rounded-md px-3 py-2" />
                    </div>
                  </>
                )}
              </div>
              {/* Ações de processamento */}
              <div className="flex justify-center gap-3 mt-6">
                <button disabled={!canProcess} onClick={processFiles} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors">
                  {t.process}
                </button>
                <button onClick={() => { setSelectedFiles([]); setFileName(null); setSuccess(null) }} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors">{t.clear}</button>
              </div>
              {processing && (
                <div className="mt-6" aria-live="polite" aria-busy={processing}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t.processing}</span>
                    <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="progress-bar h-3 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              {success && (
                <div className="mt-6 p-6 bg-green-50 border-l-4 border-green-400 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <h4 className="font-semibold text-green-800">{t.done}</h4>
                      <p className="text-green-700">{locale === 'pt' ? 'Seu arquivo está pronto para download.' : 'Your file is ready to download.'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a href={success.url} download={success.filename} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">{t.download}</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="gradient-bg text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="mb-2">© 2025 ConvertaJá — {locale === 'pt' ? 'Todos os direitos reservados' : 'All rights reserved'}</p>
          <p>
            <a
              href={`${import.meta.env.BASE_URL || '/'}privacy.html`}
              className="underline decoration-white/70 hover:decoration-white"
              rel="noopener"
            >
              {locale === 'pt' ? 'Política de Privacidade' : 'Privacy Policy'}
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
