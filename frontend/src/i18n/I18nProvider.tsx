import React, { createContext, useContext, useMemo, useState } from 'react'

export type Locale = 'pt' | 'en'

type Tool = 'merge' | 'split' | 'compress' | 'images' | 'ocr'

type ToolText = { title: string; description: string }

export interface I18nDict {
  nav: { pt: string; en: string }
  hero: { title: string; subtitle: string; features: string[] }
  chooseTool: string
  open: string
  params: {
    splitRanges: string
    quality: string
    qLow: string
    qMedium: string
    qHigh: string
    format: string
    dpi: string
    ocrLang: string
  }
  upload: { dragTitle: string; dragSubtitle: string; selectBtn: string; maxInfo: (formats: string) => string }
  files: { title: string }
  progress: { processing: string }
  actions: { process: string; clear: string }
  success: { title: string; subtitle: string; download: string }
  footer: { copyright: string; privacy: string; version: string }
  alertError: string
  pageTitle: string
  pageDescription: string
  toolTexts: Record<Tool, ToolText>
  ocrLangOptions: { por: string; eng: string; 'por+eng': string }
}

type Ctx = {
  locale: Locale
  setLocale: (l: Locale) => void
  i18n: I18nDict
}

const I18nCtx = createContext<Ctx | null>(null)

function detectInitialLocale(): Locale {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang') as Locale | null
    if (fromUrl === 'en' || fromUrl === 'pt') return fromUrl
    return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'pt'
  } catch {
    return 'pt'
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale())

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    try {
      const sp = new URLSearchParams(window.location.search)
      sp.set('lang', l)
      window.history.replaceState({}, '', `${window.location.pathname}?${sp.toString()}`)
    } catch {
      return
    }
  }

  const DICTS = useMemo(() => ({
    pt: {
      nav: { pt: 'Português', en: 'English' },
      hero: {
        title: 'Ferramentas de PDF Simples e Rápidas',
        subtitle: 'Unir, Dividir, Comprimir, Converter para Imagens e OCR (pt-BR/EN) — até 25MB grátis',
        features: ['Unir', 'Dividir', 'Comprimir', 'Imagens', 'OCR'],
      },
      chooseTool: 'Escolha sua Ferramenta',
      open: 'Abrir',
      params: {
        splitRanges: 'Intervalos (ex: 1-3,5,7-8)',
        quality: 'Qualidade',
        qLow: 'baixa', qMedium: 'média', qHigh: 'alta',
        format: 'Formato', dpi: 'DPI',
        ocrLang: 'Idioma',
      },
      upload: {
        dragTitle: 'Arraste seus arquivos aqui',
        dragSubtitle: 'ou clique para selecionar',
        selectBtn: 'Selecionar Arquivos',
        maxInfo: (formats: string) => `Tamanho máximo: 25MB por arquivo • Formatos: ${formats}`,
      },
      files: { title: 'Arquivos Selecionados:' },
      progress: { processing: 'Processando...' },
      actions: { process: 'Processar Arquivos', clear: 'Limpar' },
      success: {
        title: 'Processamento Concluído!',
        subtitle: 'Seu arquivo está pronto para download.',
        download: 'Baixar Arquivo',
      },
      footer: {
        copyright: '©2025 ConvertaJá — Ferramentas de PDF Online',
        privacy: 'Processamento seguro e privado • Sem registro necessário',
        version: 'Versão',
      },
      alertError: 'Falha ao processar arquivos. Verifique os parâmetros e tente novamente.',
      pageTitle: 'ConvertaJá — Ferramentas de PDF Online',
      pageDescription: 'Unir, dividir, converter e comprimir PDFs online em segundos.',
      toolTexts: {
        merge: { title: 'Unir PDFs', description: 'Combine vários PDFs na ordem desejada' },
        split: { title: 'Dividir PDF', description: 'Separe páginas por intervalos: 1-3,5,7-8' },
        compress: { title: 'Comprimir PDF', description: 'Reduza o tamanho do PDF (low/medium/high)' },
        images: { title: 'PDF → Imagens', description: 'Gere PNG por página no DPI desejado' },
        ocr: { title: 'OCR', description: 'Extraia texto de PDF/Imagem (pt-BR/EN)' },
      },
      ocrLangOptions: { por: 'Português', eng: 'English', 'por+eng': 'Português+Inglês' },
    } as I18nDict,
    en: {
      nav: { pt: 'Portuguese', en: 'English' },
      hero: {
        title: 'Simple, Fast PDF Tools',
        subtitle: 'Merge, Split, Compress, Convert to Images and OCR (pt-BR/EN) — up to 25MB free',
        features: ['Merge', 'Split', 'Compress', 'Images', 'OCR'],
      },
      chooseTool: 'Choose Your Tool',
      open: 'Open',
      params: {
        splitRanges: 'Ranges (e.g., 1-3,5,7-8)',
        quality: 'Quality',
        qLow: 'low', qMedium: 'medium', qHigh: 'high',
        format: 'Format', dpi: 'DPI',
        ocrLang: 'Language',
      },
      upload: {
        dragTitle: 'Drag your files here',
        dragSubtitle: 'or click to select',
        selectBtn: 'Select Files',
        maxInfo: (formats: string) => `Max size: 25MB per file • Formats: ${formats}`,
      },
      files: { title: 'Selected Files:' },
      progress: { processing: 'Processing...' },
      actions: { process: 'Process Files', clear: 'Clear' },
      success: {
        title: 'Processing Complete!',
        subtitle: 'Your file is ready to download.',
        download: 'Download File',
      },
      footer: {
        copyright: '©2025 ConvertaJá — Online PDF Tools',
        privacy: 'Secure, private processing • No signup required',
        version: 'Version',
      },
      alertError: 'Failed to process files. Check parameters and try again.',
      pageTitle: 'ConvertaJá — Online PDF Tools',
      pageDescription: 'Merge, split, convert and compress PDFs in seconds.',
      toolTexts: {
        merge: { title: 'Merge PDFs', description: 'Combine multiple PDFs in order' },
        split: { title: 'Split PDF', description: 'Extract page ranges: 1-3,5,7-8' },
        compress: { title: 'Compress PDF', description: 'Reduce PDF size (low/medium/high)' },
        images: { title: 'PDF → Images', description: 'Export PNG per page at chosen DPI' },
        ocr: { title: 'OCR', description: 'Extract text from PDF/Image (pt-BR/EN)' },
      },
      ocrLangOptions: { por: 'Portuguese', eng: 'English', 'por+eng': 'Portuguese+English' },
    } as I18nDict,
  }), [])

  const value = useMemo<Ctx>(() => ({ locale, setLocale, i18n: DICTS[locale] }), [locale, DICTS])

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
