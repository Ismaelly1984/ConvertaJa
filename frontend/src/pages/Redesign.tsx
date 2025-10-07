import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { api } from '../lib/api'
import '../styles/redesign.css'
import Navbar from '../components/Navbar'

type Tool = 'merge' | 'split' | 'compress' | 'images' | 'ocr'

type FileLike = File & { name: string; size: number }

// (tool texts moved to i18n provider)

const colorBg: Record<string, string> = {
  blue: 'bg-blue-100',
  orange: 'bg-orange-100',
  green: 'bg-green-100',
  purple: 'bg-purple-100',
  yellow: 'bg-yellow-100',
}

const colorText: Record<string, string> = {
  blue: 'text-blue-600',
  orange: 'text-orange-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  yellow: 'text-yellow-600',
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 Bytes'
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
}

export default function Redesign() {
  const { locale, setLocale, i18n } = useI18n()
  const ogImage = '/icons/og-image.png'
  const pageTitle = i18n.pageTitle
  const pageDescription = i18n.pageDescription

  const [currentTool, setCurrentTool] = useState<Tool>('merge')
  const [selectedFiles, setSelectedFiles] = useState<FileLike[]>([])
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<{ url: string; filename: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Parameters
  const [ranges, setRanges] = useState('1-3,5')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [imgFormat, setImgFormat] = useState<'png' | 'jpg'>('png')
  const [dpi, setDpi] = useState(150)
  const [lang, setLang] = useState('por')
  const appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || 'v0.1.1'

  useEffect(() => {
    // simple hero reveal without external libs
    const t = setTimeout(() => {
      document.getElementById('hero-title')?.classList.remove('opacity-0')
      document.getElementById('hero-subtitle')?.classList.remove('opacity-0')
      document.getElementById('hero-features')?.classList.remove('opacity-0')
    }, 50)
    return () => clearTimeout(t)
  }, [])

  // locale is provided by I18nProvider

  // Basic SEO/SMO meta tags (runtime upsert into <head>)
  useEffect(() => {
    function upsertMeta(selector: string, attrs: Record<string, string>) {
      let el = document.head.querySelector<HTMLMetaElement>(selector)
      if (!el) {
        el = document.createElement('meta')
        document.head.appendChild(el)
      }
      Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v))
    }
    function upsertLink(rel: string, href: string) {
      let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
      if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', rel)
        document.head.appendChild(el)
      }
      el.setAttribute('href', href)
    }

    const url = window.location.href
    document.title = pageTitle
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en'

    // Standard
    upsertMeta('meta[name="description"]', { name: 'description', content: pageDescription })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' })
    upsertLink('canonical', url)

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: pageTitle })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: pageDescription })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ogImage })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'ConvertaJá' })
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: locale === 'pt' ? 'pt_BR' : 'en_US' })

    // Twitter Cards
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: pageTitle })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: pageDescription })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage })
  }, [locale, pageTitle, pageDescription])

  // JSON-LD (Article)
  const articleJsonLd = useMemo(() => {
    const nowIso = new Date(document.lastModified || Date.now()).toISOString()
    const url = typeof window !== 'undefined' ? window.location.href : ''
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: pageTitle,
      description: pageDescription,
      inLanguage: locale === 'pt' ? 'pt-BR' : 'en',
      author: { '@type': 'Organization', name: 'ConvertaJá' },
      publisher: { '@type': 'Organization', name: 'ConvertaJá' },
      image: [ogImage],
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      datePublished: nowIso,
      dateModified: nowIso,
    }
  }, [locale, pageTitle, pageDescription])

  const canProcess = useMemo(() => {
    if (processing) return false
    if (currentTool === 'merge') return selectedFiles.length >= 2
    return selectedFiles.length >= 1
  }, [processing, currentTool, selectedFiles])

  function onSelectTool(tool: Tool) {
    setCurrentTool(tool)
    setSuccess(null)
    setProgress(0)
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  function openPicker() {
    fileInputRef.current?.click()
  }

  function handleFiles(files: FileList | File[]) {
    const list = Array.from(files) as FileLike[]
    setSelectedFiles(list)
    setSuccess(null)
  }

  function removeFile(idx: number) {
    const next = [...selectedFiles]
    next.splice(idx, 1)
    setSelectedFiles(next)
    if (next.length === 0) {
      clearSelection()
    }
  }

  function clearSelection() {
    setSelectedFiles([])
    setProcessing(false)
    setProgress(0)
    setSuccess(null)
  }

  function startProgress() {
    setProcessing(true)
    setProgress(0)
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      // ease towards 90%, complete on success
      const next = Math.min(90, 5 + Math.sqrt(elapsed / 6))
      setProgress(next)
    }, 200)
    return () => clearInterval(id)
  }

  async function processFiles() {
    if (!canProcess) return
    const stop = startProgress()
    try {
      let resp: Response
      if (currentTool === 'merge') {
        resp = await api.merge(selectedFiles)
        await handleBinary(resp, 'merged.pdf')
      } else if (currentTool === 'split') {
        const file = selectedFiles[0]
        resp = await api.split(file, ranges)
        await handleBinary(resp, 'split.zip')
      } else if (currentTool === 'compress') {
        const file = selectedFiles[0]
        resp = await api.compress(file, quality)
        await handleBinary(resp, 'compressed.pdf')
      } else if (currentTool === 'images') {
        const file = selectedFiles[0]
        resp = await api.toImages(file, imgFormat, dpi)
        await handleBinary(resp, 'images.zip')
      } else {
        const file = selectedFiles[0]
        resp = await api.ocr(file, lang)
        if (!resp.ok) throw new Error(`Erro ${resp.status}`)
        const data: { text: string; id: string } = await resp.json()
        const url = `/api/ocr/download/${data.id}`
        setSuccess({ url, filename: `${data.id}.txt` })
      }
      setProgress(100)
    } catch (err) {
      console.error(err)
      alert(i18n.alertError)
    } finally {
      stop()
      setProcessing(false)
    }
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
    // build blob url
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    setSuccess({ url, filename })
  }

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen">
      {/* JSON-LD for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {/* Nav */}
      <Navbar />

      {/* Hero */}
      <section className="gradient-bg text-white py-16 relative overflow-hidden" role="banner" aria-label="Apresentação">
        <div className="floating-particle" style={{ top: '10%', left: '10%' }} />
        <div className="floating-particle" style={{ top: '20%', right: '15%' }} />
        <div className="floating-particle" style={{ bottom: '30%', left: '20%' }} />
        <div className="floating-particle" style={{ top: '40%', right: '25%' }} />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h2 id="hero-title" className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 opacity-0" aria-label={i18n.hero.title}>{i18n.hero.title}</h2>
            <p id="hero-subtitle" className="text-xl opacity-90 mb-8 opacity-0">{i18n.hero.subtitle}</p>
            <div id="hero-features" className="grid grid-cols-2 md:grid-cols-5 gap-4 opacity-0">
              {(['📄', '✂️', '🗜️', '🖼️', '🔍'] as const).map((icon, i) => (
                <div key={`${icon}-${i}`} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center hover-lift">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="text-sm">{i18n.hero.features[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{i18n.chooseTool}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {(
                [
                  { key: 'merge', color: 'blue', title: i18n.toolTexts.merge.title, desc: i18n.toolTexts.merge.description },
                  { key: 'split', color: 'orange', title: i18n.toolTexts.split.title, desc: i18n.toolTexts.split.description },
                  { key: 'compress', color: 'green', title: i18n.toolTexts.compress.title, desc: i18n.toolTexts.compress.description },
                  { key: 'images', color: 'purple', title: i18n.toolTexts.images.title, desc: i18n.toolTexts.images.description },
                  { key: 'ocr', color: 'yellow', title: i18n.toolTexts.ocr.title, desc: i18n.toolTexts.ocr.description },
                ] as Array<{ key: Tool; color: string; title: string; desc: string }>
              ).map(({ key, color, title, desc }) => (
                <div
                  key={key}
                  data-tool={key}
                  onClick={() => onSelectTool(key)}
                  className={`tool-card rounded-xl p-6 hover-lift cursor-pointer ${currentTool === key ? 'tool-active' : ''}`}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`w-16 h-16 ${colorBg[color]} rounded-xl flex items-center justify-center mb-4`}>
                    <svg className={`w-8 h-8 ${colorText[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-gray-600 mb-4">{desc}</p>
                  <div className={`flex items-center text-sm ${colorText[color]}`}>
                    <span>{i18n.open}</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Upload */}
      <section id="upload-section" className="py-16 bg-gray-100">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{i18n.toolTexts[currentTool].title}</h3>
                <p className="text-gray-600">{i18n.toolTexts[currentTool].description}</p>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {currentTool === 'split' && (
                  <div>
                    <label className="text-sm font-medium">{i18n.params.splitRanges}</label>
                    <input value={ranges} onChange={(e) => setRanges(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
                  </div>
                )}
                {currentTool === 'compress' && (
                  <div>
                    <label className="text-sm font-medium">{i18n.params.quality}</label>
                    <div className="mt-1 flex gap-3">
                      {(['low', 'medium', 'high'] as const).map((q) => (
                        <label key={q} className="flex items-center gap-1 text-sm">
                          <input type="radio" name="quality" checked={quality === q} onChange={() => setQuality(q)} />
                          {q === 'low' ? i18n.params.qLow : q === 'medium' ? i18n.params.qMedium : i18n.params.qHigh}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {currentTool === 'images' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">{i18n.params.format}</label>
                      <select value={imgFormat} onChange={(e) => setImgFormat(e.target.value as 'png' | 'jpg')} className="mt-1 w-full border rounded-md px-3 py-2">
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{i18n.params.dpi}</label>
                      <input type="number" min={72} max={600} value={dpi} onChange={(e) => setDpi(parseInt(e.target.value || '150', 10))} className="mt-1 w-full border rounded-md px-3 py-2" />
                    </div>
                  </>
                )}
                {currentTool === 'ocr' && (
                  <div>
                    <label className="text-sm font-medium">{i18n.params.ocrLang}</label>
                    <select value={lang} onChange={(e) => setLang(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                      {(['por','eng','por+eng'] as const).map((code) => (
                        <option key={code} value={code}>{i18n.ocrLangOptions[code]}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Upload zone */}
              <div
                id="upload-zone"
                className="upload-zone rounded-xl p-12 text-center mb-6"
                onClick={openPicker}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover') }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleFiles(e.dataTransfer.files) }}
              >
                <div className="mb-6">
                  <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <h4 className="text-xl font-semibold mb-2">{i18n.upload.dragTitle}</h4>
                  <p className="text-gray-600 mb-4">{i18n.upload.dragSubtitle}</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors" aria-label={i18n.upload.selectBtn}>{i18n.upload.selectBtn}</button>
                  <input ref={fileInputRef} type="file" multiple={currentTool === 'merge'} accept={currentTool === 'ocr' ? '.pdf,.png,.jpg,.jpeg' : '.pdf'} onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
                </div>
                <div className="text-sm text-gray-500">
                  <p>{i18n.upload.maxInfo(currentTool === 'ocr' ? 'PDF/JPG/PNG' : 'PDF')}</p>
                </div>
              </div>

              {/* File list */}
              {selectedFiles.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">{i18n.files.title}</h4>
                  <div className="space-y-2">
                    {selectedFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" />
                            <path d="M6 8h8v2H6V8zm0 3h8v1H6v-1z" />
                          </svg>
                          <div>
                            <div className="font-medium">{f.name}</div>
                            <div className="text-sm text-gray-500">{formatFileSize(f.size)}</div>
                          </div>
                        </div>
                        <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress */}
              {processing && (
                <div className="mb-6" aria-live="polite" aria-busy={processing}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{i18n.progress.processing}</span>
                    <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="progress-bar h-3 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <button disabled={!canProcess} onClick={processFiles} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors">
                  {i18n.actions.process}
                </button>
                <button onClick={clearSelection} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors">{i18n.actions.clear}</button>
              </div>

              {/* Success */}
              {success && (
                <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-400 rounded-lg success-animation">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-green-800">{i18n.success.title}</h4>
                      <p className="text-green-700">{i18n.success.subtitle}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a href={success.url} download={success.filename} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">{i18n.success.download}</a>
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
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" />
                <path d="M6 8h8v2H6V8zm0 3h8v1H6v-1z" />
              </svg>
            </div>
            <span className="text-xl font-bold">ConvertaJá</span>
          </div>
          <p className="opacity-75 mb-1">{i18n.footer.copyright}</p>
          <p className="text-sm opacity-60">{i18n.footer.privacy}</p>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white/90">
              {i18n.footer.version} {appVersion}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
