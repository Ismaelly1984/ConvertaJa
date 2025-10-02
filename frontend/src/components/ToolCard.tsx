import React from 'react'

export default function ToolCard({ title, description, icon, onOpen }: {title:string, description:string, icon: React.ReactNode, onOpen: () => void}) {
  return (
    <div className="group rounded-2xl bg-white p-5 ring-1 ring-slate-200/70 shadow-[0_10px_30px_rgba(2,6,23,0.06)] hover:shadow-[0_14px_40px_rgba(2,6,23,0.09)] transition-shadow" role="region" aria-label={title}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brandIndigo to-brandViolet text-white flex items-center justify-center shadow">
          <div className="text-white/95">{icon}</div>
        </div>
        <div>
          <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
      </div>
      <button className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-brandIndigo to-brandViolet text-white font-medium shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-200" onClick={onOpen} aria-label={`Abrir ${title}`}>
        Abrir
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14"/>
          <path d="M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
  )
}
