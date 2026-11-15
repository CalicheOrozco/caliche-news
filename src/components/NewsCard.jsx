import { relative, fullDate } from '../time.js'
import Cover from './Cover.jsx'
import SaveButton from './SaveButton.jsx'

export const LANG = { es: 'ES', en: 'EN', fr: 'FR' }

// Tarjeta: al tocarla abre el detalle. "Leer" va directo al artículo original.
export default function NewsCard({ item, categoryLabel, onOpen, onToggleSave }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item) } }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 text-left transition hover:border-emerald-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="aspect-[16/9] overflow-hidden bg-zinc-800">
        <Cover item={item} className="transition duration-300 group-hover:scale-[1.02]" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">{item.source}</span>
          <span aria-hidden>·</span>
          <time dateTime={item.publishedAt} title={fullDate(item.publishedAt)}>{relative(item.publishedAt)}</time>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-400">{LANG[item.lang] || item.lang}</span>
          {categoryLabel && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">{categoryLabel}</span>}
        </div>

        <h2 className="text-lg font-semibold leading-snug text-zinc-50 group-hover:text-emerald-200">{item.title}</h2>
        {item.summary && <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">{item.summary}</p>}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-medium text-emerald-400">Ver resumen →</span>
          <SaveButton item={item} onToggleSave={onToggleSave} />
        </div>
      </div>
    </article>
  )
}
