import { useState } from 'react'
import { markShared, shareUrl } from '../api.js'

// Compartir el resumen de Caliche News (no el artículo original): quien lo abra ve el resumen y,
// si quiere, toca "Leer noticia completa". En el iPhone abre el menú de compartir del sistema;
// donde no existe, copia el link. Al compartir, la noticia deja de borrarse a los 7 días.
export default function ShareButton({ item, compact = false, className = '' }) {
  const [copied, setCopied] = useState(false)
  async function share(e) {
    e.stopPropagation()
    const url = shareUrl(item)
    markShared(item.id).catch(() => {})
    if (navigator.share) {
      try { await navigator.share({ title: item.title, text: item.title, url }); return } catch (err) { if (err?.name === 'AbortError') return }
    }
    try {
      await navigator.clipboard.writeText(`${item.title}\n${url}`)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { window.prompt('Copia el link:', url) }
  }
  return (
    <button type="button" onClick={share} title="Compartir resumen" aria-label="Compartir resumen"
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      {copied ? 'Copiado' : compact ? null : 'Compartir'}
    </button>
  )
}
