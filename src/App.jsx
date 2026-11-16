import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCategories, getCounts, getNews, getNewsItem, setSaved } from './api.js'
import NewsCard from './components/NewsCard.jsx'
import NewsModal from './components/NewsModal.jsx'

const PAGE = 30
const SAVED = 'guardadas'
const BILINGUAL = ['ia', 'tecnologia', 'internacional']  // categorías con filtro de idioma

export default function App() {
  const [categories, setCategories] = useState([])
  const [tab, setTab] = useState(() => localStorage.getItem('cn.tab') || 'ia')
  const [lang, setLang] = useState('')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')  // búsqueda con retraso
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const reqId = useRef(0)
  const [open, setOpen] = useState(null)  // noticia abierta en el detalle
  const [linkError, setLinkError] = useState('')

  // Link compartido (/n/:id, o /?n=id tras pasar por la vista previa): abre esa noticia.
  useEffect(() => {
    const id = location.pathname.match(/^\/n\/([\w-]+)/)?.[1] || new URLSearchParams(location.search).get('n')
    if (!id) return
    getNewsItem(id).then(setOpen).catch(() => setLinkError('Esa noticia ya no está disponible.'))
  }, [])
  // La dirección sigue a la noticia abierta, para poder copiarla o recargar.
  useEffect(() => {
    const want = open ? `/n/${open.id}` : '/'
    if (location.pathname + location.search !== want) history.replaceState(null, '', want)
  }, [open])
  const cache = useRef(new Map())  // pestaña/filtros -> { items, more }
  const [counts, setCounts] = useState(null)  // { categories: { ia: 20, ... }, saved: 3 }
  const refreshCounts = useCallback(() => { getCounts().then(setCounts).catch(() => {}) }, [])
  useEffect(() => { refreshCounts() }, [refreshCounts])

  useEffect(() => { getCategories().then((d) => setCategories(d.categories)).catch((e) => setError(e.message)) }, [])
  useEffect(() => { try { localStorage.setItem('cn.tab', tab) } catch { /* sin almacenamiento */ } }, [tab])
  useEffect(() => { const t = setTimeout(() => setQ(query.trim()), 300); return () => clearTimeout(t) }, [query])

  const labels = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.label])), [categories])
  const searching = q.length > 0
  const params = useMemo(() => ({
    // Al buscar se busca en todas las categorías (o solo en Guardadas si esa pestaña está abierta).
    category: searching || tab === SAVED ? undefined : tab,
    saved: tab === SAVED,
    lang: !searching && BILINGUAL.includes(tab) ? lang : '',
    q,  // mismo orden de claves que la precarga: la clave de caché es JSON.stringify(params)
  }), [tab, lang, q, searching])

  const key = JSON.stringify(params)

  const load = useCallback(async (before) => {
    const id = ++reqId.current
    setError('')
    if (!before) {
      // Cambio de pestaña: lo que ya se vio aparece al instante; si no, esqueletos (no las de la pestaña anterior).
      const hit = cache.current.get(key)
      setItems(hit ? hit.items : [])
      setMore(hit ? hit.more : false)
      setLoading(!hit)
    } else setLoading(true)
    try {
      const d = await getNews({ ...params, before, limit: PAGE })
      if (id !== reqId.current) return  // llegó una respuesta vieja
      const next = before ? [...(cache.current.get(key)?.items || []), ...d.items] : d.items
      const nextMore = !q && d.items.length === PAGE  // la búsqueda ordena por relevancia: sin paginar
      cache.current.set(key, { items: next, more: nextMore })
      setItems(next)
      setMore(nextMore)
    } catch (e) {
      if (id === reqId.current) setError(e.message)
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [params, q, key])

  useEffect(() => { load() }, [load])

  // Precarga las demás categorías en segundo plano para que el cambio de pestaña sea instantáneo.
  useEffect(() => {
    if (!categories.length) return
    const t = setTimeout(() => {
      for (const c of categories) {
        const p = { category: c.id, saved: false, lang: '', q: '' }
        const k = JSON.stringify(p)
        if (cache.current.has(k)) continue
        getNews({ ...p, limit: PAGE })
          .then((d) => { if (!cache.current.has(k)) cache.current.set(k, { items: d.items, more: d.items.length === PAGE }) })
          .catch(() => {})
      }
    }, 800)
    return () => clearTimeout(t)
  }, [categories])

  async function toggleSave(item) {
    const updated = await setSaved(item.id, !item.saved)
    // Actualiza todas las pestañas guardadas en caché; la de Guardadas se vuelve a pedir al abrirla.
    for (const [k, v] of cache.current) {
      if (JSON.parse(k).saved) cache.current.delete(k)
      else cache.current.set(k, { ...v, items: v.items.map((i) => (i.id === item.id ? updated : i)) })
    }
    setOpen((o) => (o && o.id === updated.id ? updated : o))
    setCounts((c) => c && { ...c, saved: Math.max(0, c.saved + (updated.saved ? 1 : -1)) })
    setItems((prev) => (tab === SAVED && !updated.saved
      ? prev.filter((i) => i.id !== item.id)
      : prev.map((i) => (i.id === item.id ? updated : i))))
  }

  const tabs = [...categories, { id: SAVED, label: 'Guardadas' }]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="safe-top sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight">Caliche <span className="text-emerald-400">News</span></h1>
          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Buscar noticias</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === SAVED ? 'Buscar en guardadas…' : 'Buscar en todas las noticias…'}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Categorías">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setLang('') }}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                tab === t.id ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              {t.id === SAVED ? '★ ' : ''}{t.label}
              {counts && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  tab === t.id ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {t.id === SAVED ? counts.saved : counts.categories[t.id] || 0}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            {searching
              ? `Resultados para “${q}”${tab === SAVED ? ' en guardadas' : ''}`
              : tab === SAVED ? 'Noticias guardadas · no se borran' : `${labels[tab] || ''} · las no guardadas se borran a los 7 días`}
          </p>
          {!searching && BILINGUAL.includes(tab) && (
            <div className="flex rounded-lg border border-zinc-800 p-0.5 text-sm" role="group" aria-label="Idioma">
              {[['', 'Todas'], ['es', 'Español'], ['en', 'English']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setLang(v)}
                  className={`rounded-md px-3 py-1 transition ${lang === v ? 'bg-emerald-500/20 text-emerald-200' : 'text-zinc-400 hover:text-zinc-100'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {linkError && <p className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{linkError}</p>}
        {error && <p className="mb-4 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">Error: {error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="py-20 text-center text-zinc-500">
            {searching ? 'Sin resultados.' : tab === SAVED ? 'Aún no guardas noticias. Usa el botón “Guardar” de cualquier noticia.' : 'Aún no hay noticias en esta categoría.'}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              categoryLabel={searching || tab === SAVED ? labels[item.category] : null}
              onOpen={setOpen}
              onToggleSave={toggleSave}
            />
          ))}
          {loading && items.length === 0 && Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60" />
          ))}
        </div>

        {more && (
          <div className="mt-8 flex justify-center">
            <button type="button" disabled={loading} onClick={() => load(items.at(-1)?.publishedAt)}
              className="rounded-xl border border-zinc-800 px-5 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50">
              {loading ? 'Cargando…' : 'Cargar más'}
            </button>
          </div>
        )}
      </main>

      {open && (
        <NewsModal item={open} categoryLabel={labels[open.category]} onClose={() => setOpen(null)} onToggleSave={toggleSave} />
      )}
    </div>
  )
}
