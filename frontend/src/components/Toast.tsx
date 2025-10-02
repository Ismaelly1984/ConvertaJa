import React, { useEffect } from 'react'

export default function Toast({ type, children, onClose }: {type:'success'|'error', children: React.ReactNode, onClose: () => void}) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000)
    return () => clearTimeout(id)
  }, [onClose])
  return (
    <div className={`toast ${type==='success' ? 'toast--success' : 'toast--error'}`} role="status" aria-live="polite">
      {children}
    </div>
  )
}
