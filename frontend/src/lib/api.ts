const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = {
  merge(files: File[]) {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    return fetch(`${BASE}/api/pdf/merge`, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/pdf, application/octet-stream' },
    })
  },
  split(file: File, ranges: string) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('ranges', ranges)
    return fetch(`${BASE}/api/pdf/split`, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/zip, application/octet-stream' },
    })
  },
  compress(file: File, quality: 'low'|'medium'|'high') {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('quality', quality)
    return fetch(`${BASE}/api/pdf/compress`, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/pdf, application/octet-stream' },
    })
  },
  toImages(file: File, format: 'jpg'|'png', dpi: number) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('format', format)
    fd.append('dpi', String(dpi))
    return fetch(`${BASE}/api/pdf/to-images`, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/zip, application/octet-stream' },
    })
  },
  ocr(file: File, lang: string) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('lang', lang)
    return fetch(`${BASE}/api/ocr`, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json, text/plain' },
    })
  }
}
