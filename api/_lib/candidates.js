// Junta noticias candidatas de los RSS de una categoría: recientes, sin repetidos y marcando
// las que ya están en la base.
import { SOURCES } from './sources.js'
import { fetchText, parseFeed } from './feeds.js'
import { news } from './db.js'

const PER_FEED = 25
export const FORMAT = 2  // formato del resumen: 2 = idioma original + "Para ti" sin repetir

export async function gatherCandidates(category, { hours = 72, max = 40 } = {}) {
  const failed = []
  const cutoff = Date.now() - hours * 3600e3
  const lists = await Promise.all(SOURCES[category].map(async (src) => {
    // <source> solo trae el medio real en Google News; en otros feeds (France 24) es el crédito de la foto.
    const isGN = src.url.includes('news.google.com')
    try {
      return parseFeed(await fetchText(src.url)).slice(0, PER_FEED)
        .filter((it) => it.publishedAt.getTime() >= cutoff)
        .map((it) => ({ ...it, lang: src.lang, source: (isGN && it.origin) || src.name.replace(/\s*\(Google.*\)$/, '') }))
    } catch (e) {
      failed.push({ source: src.name, error: e.message })
      return []
    }
  }))
  const seen = new Set()
  const all = lists.flat().filter((it) => !seen.has(it.url) && seen.add(it.url))
  all.sort((a, b) => b.publishedAt - a.publishedAt)
  const top = all.slice(0, max)
  const existing = new Map((await (await news()).find({ url: { $in: top.map((t) => t.url) } }, { projection: { url: 1, fmt: 1 } }).toArray()).map((d) => [d.url, d.fmt || 1]))
  return {
    candidates: top.map((c) => ({ ...c, inDatabase: existing.has(c.url), outdated: existing.has(c.url) && existing.get(c.url) < FORMAT })),
    failed,
  }
}
