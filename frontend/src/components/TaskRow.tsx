import React from 'react'
import ProgressBar from './ProgressBar'

export type Task = {
  id: string
  filename: string
  tool: string
  status: 'Carregando'|'Processando'|'Concluída'|'Erro'
  progress: number
  downloadUrl?: string
}

export default function TaskRow({ task, onDownload }: {task: Task, onDownload: (t: Task) => void}) {
  return (
    <tr className="border-b">
      <td className="p-2 text-sm">{task.filename}</td>
      <td className="p-2 text-sm">{task.tool}</td>
      <td className="p-2 text-sm">{task.status}</td>
      <td className="p-2"><ProgressBar value={task.progress} /></td>
      <td className="p-2">
        {task.downloadUrl && (
          <button className="px-3 py-1 rounded bg-slate-900 text-white" onClick={() => onDownload(task)}>
            Baixar
          </button>
        )}
      </td>
    </tr>
  )
}

