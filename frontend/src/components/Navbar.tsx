import React from 'react'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur bg-white/70 border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group" aria-label="ConvertaJá Home">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-brandIndigo to-brandViolet shadow" />
          <span className="font-semibold text-slate-900 tracking-tight group-hover:opacity-90">ConvertaJá</span>
        </a>
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/40 shadow">
            Login
          </button>
        </div>
      </div>
    </nav>
  )
}
