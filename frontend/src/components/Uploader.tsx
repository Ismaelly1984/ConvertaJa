import React, { useRef, useState } from 'react'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'
import TaskRow, { Task } from './TaskRow'

type Tool = 'merge' | 'split' | 'compress' | 'to-images' | 'ocr'

export default function Uploader({ tool, onClose, onToast }: {tool: Tool, onClose: () => void, onToast: (t:{type:'success'|'error', message:string})=>void}) {
  const [files, setFiles] = useState<File[]>([])
  const [ranges, setRanges] = useState('')
  const [quality, setQuality] = useState<'low'|'medium'|'high'>('medium')
  const [format, setFormat] = useState<'jpg'|'png'>('jpg')
  const [dpi, setDpi] = useState(150)
  const [lang, setLang] = useState('por')
  const [tasks, setTasks] = useState<Task[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
  }
  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
  }
  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    if ((tool === 'merge' && files.length < 2) || (tool !== 'merge' && files.length < 1)) {
      onToast({type:'error', message:'Selecione arquivos suficientes.'});
      return;
    }
    const task: Task = { id: `${Date.now()}`, filename: files.map(f=>f.name).join(', '), tool, status: 'Carregando', progress: 10 }
    setTasks((prev) => [task, ...prev])
    try {
      let res: Response
      if (tool === 'merge') res = await api.merge(files)
      else if (tool === 'split') res = await api.split(files[0], ranges)
      else if (tool === 'compress') res = await api.compress(files[0], quality)
      else if (tool === 'to-images') res = await api.toImages(files[0], format, dpi)
      else res = await api.ocr(files[0], lang)

      task.status = 'Processando'; task.progress = 60; setTasks((prev)=> prev.map(t=>t.id===task.id?{...task}:t))

      const ct = (res.headers.get('content-type') || '').toLowerCase()
      const expectPdf = tool === 'merge' || tool === 'compress'
      const expectZip = tool === 'split' || tool === 'to-images'

      if (!res.ok) {
        // Try to parse a JSON/text error from server
        let message: string = `Erro ${res.status}`
        try {
          if (ct.includes('application/json')) {
            const data: { error?: string; message?: string } = await res.json()
            message = data?.error || data?.message || message
          } else {
            const text = await res.text()
            if (text) message = text.slice(0, 200)
          }
        } catch { /* noop */ }
        throw new Error(message)
      }

      if (tool === 'ocr') {
        const data: { text?: string } = await res.json()
        const blob = new Blob([data.text ?? ''], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        task.downloadUrl = url
      } else {
        // Validate content-type to avoid saving HTML/JSON as .pdf/.zip
        const validType = expectPdf ? (ct.includes('application/pdf') || ct.includes('application/octet-stream'))
          : expectZip ? (ct.includes('application/zip') || ct.includes('application/octet-stream'))
          : true
        if (!validType) throw new Error('Resposta do servidor não é um arquivo esperado (content-type inválido).')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        task.downloadUrl = url
      }
      task.status = 'Concluída'; task.progress = 100
      setTasks((prev)=> prev.map(t=>t.id===task.id?{...task}:t))
      onToast({type:'success', message:'Tarefa concluída'})
    } catch (e: unknown) {
      task.status = 'Erro'; task.progress = 100
      setTasks((prev)=> prev.map(t=>t.id===task.id?{...task}:t))
      const message = e instanceof Error ? e.message : 'Erro na tarefa'
      onToast({type:'error', message})
    }
  }

  function onDownload(t: Task) {
    if (t.downloadUrl) {
      const a = document.createElement('a')
      a.href = t.downloadUrl
      a.download = t.tool === 'merge' ? 'merged.pdf' : t.tool==='compress' ? 'compressed.pdf' : t.tool==='split' ? 'split.zip' : t.tool==='to-images' ? 'images.zip' : 'ocr.txt'
      a.click()
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow" role="dialog" aria-label="Uploader">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{tool.toUpperCase()}</h2>
        <button onClick={onClose} className="text-slate-600">Fechar</button>
      </div>
      <div className="mt-4">
        <div onDragOver={(e)=>e.preventDefault()} onDrop={onDrop} className="border-2 border-dashed rounded p-6 text-center focus:outline-none" tabIndex={0} aria-label="Área de arraste e solte">
          Arraste seus arquivos aqui ou
          <button className="ml-2 underline" onClick={()=>inputRef.current?.click()}>Selecionar</button>
          <input ref={inputRef} type="file" onChange={onSelect} multiple={tool==='merge'} className="sr-only" accept={tool==='ocr'?'.pdf,.jpg,.jpeg,.png':'.pdf'} />
        </div>
        {!!files.length && (
          <ul className="mt-3 space-y-1" aria-label="Arquivos selecionados">
            {files.map((f, i)=> (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>{f.name} — {formatBytes(f.size)}</span>
                <button onClick={()=>removeFile(i)} className="text-slate-600">Remover</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tool==='split' && (
            <input aria-label="Ranges" placeholder="1-3,5,7-8" value={ranges} onChange={(e)=>setRanges(e.target.value)} className="border rounded px-2 py-1" />
          )}
          {tool==='compress' && (
            <select aria-label="Qualidade" value={quality} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setQuality(e.target.value as 'low'|'medium'|'high')} className="border rounded px-2 py-1">
              <option value="low">low (72–96 DPI)</option>
              <option value="medium">medium (150–200 DPI)</option>
              <option value="high">high (220–300 DPI)</option>
            </select>
          )}
          {tool==='to-images' && (
            <>
              <select aria-label="Formato" value={format} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setFormat(e.target.value as 'jpg'|'png')} className="border rounded px-2 py-1">
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
              </select>
              <input aria-label="DPI" type="number" value={dpi} onChange={(e)=>setDpi(parseInt(e.target.value)||150)} className="border rounded px-2 py-1" />
            </>
          )}
          {tool==='ocr' && (
            <select aria-label="Idioma" value={lang} onChange={(e)=>setLang(e.target.value)} className="border rounded px-2 py-1">
              <option value="por">pt-BR</option>
              <option value="eng">en</option>
              <option value="por+eng">pt-BR + en</option>
            </select>
          )}
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 rounded bg-slate-900 text-white" onClick={submit}>Enviar</button>
        </div>
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Fila de tarefas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-600">
                  <th className="p-2">Arquivo</th>
                  <th className="p-2">Ferramenta</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Progresso</th>
                  <th className="p-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t)=> <TaskRow key={t.id} task={t} onDownload={onDownload} />)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
