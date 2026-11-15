import { useState } from 'react'

export default function SaveButton({ item, onToggleSave, className = '' }) {
  const [busy, setBusy] = useState(false)
  async function toggle(e) {
    e.stopPropagation()
    setBusy(true)
    try { await onToggleSave(item) } finally { setBusy(false) }
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={item.saved}
      title={item.saved ? 'Quitar de guardadas' : 'Guardar (no se borra)'}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        item.saved ? 'bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
      } ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={item.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      {item.saved ? 'Guardada' : 'Guardar'}
    </button>
  )
}
