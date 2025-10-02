import React, { useCallback, useMemo, useRef, useState } from 'react'
import './Modal.css'

export type TaskStatus = 'processing' | 'done' | 'error'

export type Task = {
  id: string
  fileName: string
  tool: string
  status: TaskStatus
  progress: number
  downloadUrl?: string
}

type Tool = 'merge' | 'split' | 'compress' | 'to-images' | 'ocr'

export interface ModalProps {
  isOpen: boolean
  title?: string
  tool: Tool
  onClose: () => void
  onSend?: (payload: {
    files: File[]
    ranges?: string
    quality?: 'low' | 'medium' | 'high'
    format?: 'jpg' | 'png'
    dpi?: number
    lang?: string
  }) => void
  tasks?: Task[]
  onDownload?: (task: Task) => void
  closeOnBackdrop?: boolean
}

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
)

export default function Modal({
  isOpen,
  title = 'Processar PDF',
  tool,
  onClose,
  onSend,
  tasks,
  onDownload,
  closeOnBackdrop = true,
}: ModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [ranges, setRanges] = useState('')
  const [quality, setQuality] = useState<'low'|'medium'|'high'>('medium')
  const [format, setFormat] = useState<'jpg'|'png'>('jpg')
  const [dpi, setDpi] = useState(150)
  const [lang, setLang] = useState('por')
  const inputRef = useRef<HTMLInputElement>(null)

  const hasTasks = (tasks?.length ?? 0) > 0
  const allowMultiple = tool === 'merge'
  const accept = tool === 'ocr' ? '.pdf,.jpg,.jpeg,.png' : '.pdf'

  const handleBrowse = useCallback(() => inputRef.current?.click(), [])

  const handleFiles = useCallback((flist: FileList | null) => {
    if (!flist || flist.length === 0) return
    const list = Array.from(flist)
    if (allowMultiple) {
      setFiles((prev) => [...prev, ...list])
    } else {
      setFiles([list[0]])
    }
  }, [allowMultiple])

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false) }
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); handleFiles(e.dataTransfer.files) }

  const handleSend = useCallback(() => {
    onSend?.({ files, ranges, quality, format, dpi, lang })
  }, [files, ranges, quality, format, dpi, lang, onSend])

  const onBackdropClick = (e: React.MouseEvent) => { if (!closeOnBackdrop) return; if (e.target === e.currentTarget) onClose() }

  const statusClass = useCallback((status: TaskStatus) => {
    switch (status) {
      case 'done': return 'cj-status cj-status--done'
      case 'error': return 'cj-status cj-status--error'
      default: return 'cj-status cj-status--processing'
    }
  }, [])

  const progressBarClass = useMemo(() => 'cj-progress__bar', [])

  if (!isOpen) return null

  return (
    <div className="cj-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onBackdropClick}>
      <div className="cj-modal" role="document">
        <header className="cj-modal__header">
          <h2 className="cj-modal__title">{title}</h2>
          <button className="cj-btn cj-btn--icon" onClick={onClose} aria-label="Fechar">×</button>
        </header>

        <div className="cj-modal__body">
          {/* Upload Area */}
          <section className={`cj-upload ${dragActive ? 'is-drag' : ''}`}
            onDragOver={onDragOver}
            onDragEnter={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onClick={handleBrowse}
            aria-label="Área de upload"
          >
            <div className="cj-upload__inner">
              <span className="cj-upload__icon"><UploadIcon /></span>
              <p className="cj-upload__text">{allowMultiple ? 'Arraste seus PDFs aqui ou clique para selecionar' : 'Arraste seu PDF aqui ou clique para selecionar'}</p>
              {!allowMultiple && files[0] && <p className="cj-upload__file">Selecionado: {files[0].name}</p>}
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={allowMultiple}
                className="cj-upload__input"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </section>

          {/* File list (merge) */}
          {allowMultiple && !!files.length && (
            <ul className="cj-files" aria-label="Arquivos selecionados">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="cj-files__item">
                  <span className="cj-files__name">{f.name}</span>
                  <button className="cj-files__remove" onClick={() => removeFile(i)} aria-label={`Remover ${f.name}`}>Remover</button>
                </li>
              ))}
            </ul>
          )}

          {/* Tool-specific fields */}
          {tool === 'split' && (
            <div className="cj-field">
              <label htmlFor="ranges" className="cj-label">Intervalos de páginas</label>
              <input
                id="ranges"
                type="text"
                inputMode="numeric"
                className="cj-input"
                placeholder="1-3,5,7-8"
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
              />
            </div>
          )}

          {tool === 'compress' && (
            <div className="cj-field">
              <label htmlFor="quality" className="cj-label">Qualidade</label>
              <select id="quality" className="cj-input" value={quality} onChange={(e) => setQuality(e.target.value as 'low'|'medium'|'high')}>
                <option value="low">low (72–96 DPI)</option>
                <option value="medium">medium (150–200 DPI)</option>
                <option value="high">high (220–300 DPI)</option>
              </select>
            </div>
          )}

          {tool === 'to-images' && (
            <div className="cj-grid">
              <div className="cj-field">
                <label htmlFor="format" className="cj-label">Formato</label>
                <select id="format" className="cj-input" value={format} onChange={(e) => setFormat(e.target.value as 'jpg'|'png')}>
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                </select>
              </div>
              <div className="cj-field">
                <label htmlFor="dpi" className="cj-label">DPI</label>
                <input id="dpi" type="number" className="cj-input" value={dpi} onChange={(e) => setDpi(parseInt(e.target.value) || 150)} />
              </div>
            </div>
          )}

          {tool === 'ocr' && (
            <div className="cj-field">
              <label htmlFor="lang" className="cj-label">Idioma</label>
              <select id="lang" className="cj-input" value={lang} onChange={(e)=> setLang(e.target.value)}>
                <option value="por">pt-BR</option>
                <option value="eng">en</option>
                <option value="por+eng">pt-BR + en</option>
              </select>
            </div>
          )}

          {/* Send */}
          <div className="cj-actions">
            <button className="cj-btn cj-btn--primary" onClick={handleSend}>
              Enviar <span className="cj-btn__arrow" aria-hidden>→</span>
            </button>
          </div>

          {/* Tasks Table (desktop) */}
          {hasTasks && (
            <section className="cj-tasks">
              <h3 className="cj-section-title">Tarefas</h3>
              <div className="cj-table-wrap">
                <table className="cj-table cj-table--desktop">
                  <thead>
                    <tr>
                      <th>Arquivo</th>
                      <th>Ferramenta</th>
                      <th>Status</th>
                      <th>Progresso</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tasks || []).map((t) => (
                      <tr key={t.id}>
                        <td>{t.fileName}</td>
                        <td>{t.tool}</td>
                        <td>
                          <span className={statusClass(t.status)}>
                            {t.status === 'done' && 'Concluído'}
                            {t.status === 'processing' && 'Processando'}
                            {t.status === 'error' && 'Erro'}
                          </span>
                        </td>
                        <td>
                          <div className="cj-progress" aria-label={`Progresso ${t.progress}%`}>
                            <div className={progressBarClass} style={{ width: `${Math.max(0, Math.min(100, t.progress))}%` }} />
                          </div>
                        </td>
                        <td>
                          <button
                            className="cj-btn cj-btn--download"
                            disabled={t.status !== 'done'}
                            onClick={() => onDownload?.(t)}
                          >
                            Baixar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cards (mobile) */}
                <div className="cj-cards cj-table--mobile">
                  {(tasks || []).map((t) => (
                    <div key={t.id} className="cj-card">
                      <div className="cj-card__row">
                        <span className="cj-card__label">Arquivo</span>
                        <span className="cj-card__value">{t.fileName}</span>
                      </div>
                      <div className="cj-card__row">
                        <span className="cj-card__label">Ferramenta</span>
                        <span className="cj-card__value">{t.tool}</span>
                      </div>
                      <div className="cj-card__row">
                        <span className="cj-card__label">Status</span>
                        <span className="cj-card__value"><span className={statusClass(t.status)}>
                          {t.status === 'done' && 'Concluído'}
                          {t.status === 'processing' && 'Processando'}
                          {t.status === 'error' && 'Erro'}
                        </span></span>
                      </div>
                      <div className="cj-card__row">
                        <span className="cj-card__label">Progresso</span>
                        <span className="cj-card__value">
                          <div className="cj-progress" aria-label={`Progresso ${t.progress}%`}>
                            <div className={progressBarClass} style={{ width: `${Math.max(0, Math.min(100, t.progress))}%` }} />
                          </div>
                        </span>
                      </div>
                      <div className="cj-card__row cj-card__row--actions">
                        <button
                          className="cj-btn cj-btn--download"
                          disabled={t.status !== 'done'}
                          onClick={() => onDownload?.(t)}
                        >
                          Baixar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
