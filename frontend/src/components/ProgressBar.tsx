import React from 'react'

export default function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-slate-200 rounded" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="h-2 bg-green-600 rounded" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

