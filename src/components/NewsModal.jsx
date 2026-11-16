import { useEffect, useRef } from 'react'
import { fullDate, relative } from '../time.js'
import Cover from './Cover.jsx'
import SaveButton from './SaveButton.jsx'
import ShareButton from './ShareButton.jsx'
import { LANG } from './NewsCard.jsx'

// Detalle de una noticia: resumen completo y puntos clave; "Leer noticia completa" abre el original.
// Títulos de sección en el idioma del resumen: las notas en inglés y francés se resumen en inglés.
const LABELS = {
  es: { summary: 'Resumen', forYou: 'Para ti' },
  en: { summary: 'Summary', forYou: 'For you' },
}

export default function NewsModal({ item, categoryLabel, onClose, onToggleSave }) {
  const t = LABELS[item.lang === 'es' ? 'es' : 'en']
  const closeRef = useRef(null)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="safe-modal fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="news-title" onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-3xl">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-zinc-200 transition hover:bg-black/80">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>

        <div className="aspect-[16/9] overflow-hidden bg-zinc-800"><Cover item={item} /></div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
            <span className="font-medium text-zinc-200">{item.source}</span>
            <span aria-hidden>·</span>
            <time dateTime={item.publishedAt}>{fullDate(item.publishedAt)} ({relative(item.publishedAt)})</time>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-semibold text-zinc-400">{LANG[item.lang] || item.lang}</span>
            {categoryLabel && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-300">{categoryLabel}</span>}
          </div>

          <h2 id="news-title" className="text-2xl font-bold leading-tight text-zinc-50">{item.title}</h2>

          {item.summary && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">{t.summary}</h3>
              <p className="leading-relaxed text-zinc-200">{item.summary}</p>
            </section>
          )}

          {item.keyPoints?.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">{t.forYou}</h3>
              <ul className="space-y-2">
                {item.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-2 text-zinc-300">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-zinc-500">Resumen escrito por Claude a partir de la nota original, en su idioma. Agregada {relative(item.addedAt)}.</p>

        </div>
        {/* Acciones fijas abajo: el link al original siempre a la vista, aunque el resumen sea largo */}
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-400">
              Leer noticia completa
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M7 17 17 7M9 7h8v8" /></svg>
            </a>
            <div className="flex items-center gap-1">
              <ShareButton item={item} />
              <SaveButton item={item} onToggleSave={onToggleSave} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
