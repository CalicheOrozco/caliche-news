// Junta noticias candidatas de los RSS de una categoría: recientes, sin repetidos, sin las que ya
// están en la base con el formato actual y sin las de Google News que una fuente directa ya cuenta.
import { SOURCES } from './sources.js'
import { CATEGORIES } from './categories.js'
import { fetchText, parseFeed } from './feeds.js'
import { news } from './db.js'

const PER_FEED = 25
export const FORMAT = 2  // formato del resumen: 2 = idioma original + "Para ti" sin repetir

// Título comparable: sin " - Medio" (Google News lo añade), acentos, signos ni mayúsculas.
const norm = (t) => t.replace(/\s+[-|–]\s+[^-|–]{2,40}$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70)
const want = (c) => (c.perLang ? Object.values(c.perLang).reduce((a, b) => a + b, 0) : c.total)

export async function gatherCandidates(category, { hours = 72, max, includeExisting = false } = {}) {
  const cat = CATEGORIES[category]
  // Por defecto: el doble de lo que se va a guardar, con tope de 30 (las categorías de 10 → 20).
  max = max || Math.min(30, 2 * want(cat))
  const failed = []
  const cutoff = Date.now() - hours * 3600e3
  const lists = await Promise.all(SOURCES[category].map(async (src) => {
    // <source> solo trae el medio real en Google News; en otros feeds (France 24) es el crédito de la foto.
    const isGN = src.url.includes('news.google.com')
    try {
      return parseFeed(await fetchText(src.url)).slice(0, PER_FEED)
        .filter((it) => it.publishedAt.getTime() >= cutoff)
        .filter((it) => !src.match || src.match.test(`${it.title} ${it.excerpt}`))
        .map((it) => ({ ...it, lang: src.lang, isGN, readable: !src.noRead, source: (isGN && it.origin) || src.name.replace(/\s*\(Google.*\)$/, '') }))
    } catch (e) {
      failed.push({ source: src.name, error: e.message })
      return []
    }
  }))
  const seenUrl = new Set()
  let all = lists.flat().filter((it) => !seenUrl.has(it.url) && seenUrl.add(it.url))
  // Misma historia por Google News y por una fuente directa: se queda la directa.
  const direct = new Set(all.filter((it) => !it.isGN).map((it) => norm(it.title)))
  const dupes = all.filter((it) => it.isGN && direct.has(norm(it.title))).length
  all = all.filter((it) => !(it.isGN && direct.has(norm(it.title))))
  const col = await news()
  const docs = await col.find({ url: { $in: all.map((t) => t.url) } }, { projection: { url: 1, fmt: 1 } }).toArray()
  const existing = new Map(docs.map((d) => [d.url, d.fmt || 1]))
  const tagged = all.map((c) => ({ ...c, inDatabase: existing.has(c.url), outdated: existing.has(c.url) && existing.get(c.url) < FORMAT }))
  const usable = includeExisting ? tagged : tagged.filter((c) => !c.inDatabase || c.outdated)
  // Primero las nuevas, luego las de formato viejo; dentro de cada grupo, las que se pueden leer
  // (fuentes directas) y después las más recientes.
  usable.sort((a, b) => (a.inDatabase - b.inDatabase) || (b.readable - a.readable) || (a.isGN - b.isGN) || (b.publishedAt - a.publishedAt))
  // Bilingües (IA, Tecnología, Internacional): mitad por idioma, para cubrir las dos cuotas.
  let top
  if (cat.perLang) {
    const langs = Object.keys(cat.perLang), per = Math.ceil(max / langs.length)
    top = langs.flatMap((l) => usable.filter((c) => c.lang === l).slice(0, per))
  } else top = usable.slice(0, max)
  return {
    candidates: top,
    failed,
    skipped: { alreadyCurrent: tagged.length - usable.length, googleNewsDuplicates: dupes, overLimit: usable.length - top.length },
  }
}
