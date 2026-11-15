// Junta noticias candidatas de los RSS de una categoría: recientes, sin repetidos y marcando
// las que ya están en la base.
import { SOURCES } from './sources.js'
import { fetchText, parseFeed } from './feeds.js'
import { news } from './db.js'

const PER_FEED = 25

export async function gatherCandidates(category, { hours = 72, max = 80 } = {}) {
  const failed = []
  const cutoff = Date.now() - hours * 3600e3
  const lists = await Promise.all(SOURCES[category].map(async (src) => {
    try {
      return parseFeed(await fetchText(src.url)).slice(0, PER_FEED)
        .filter((it) => it.publishedAt.getTime() >= cutoff)
        .map((it) => ({ ...it, lang: src.lang, source: it.origin || src.name.replace(/\s*\(Google.*\)$/, '') }))
    } catch (e) {
      failed.push({ source: src.name, error: e.message })
      return []
    }
  }))
  const seen = new Set()
  const all = lists.flat().filter((it) => !seen.has(it.url) && seen.add(it.url))
  all.sort((a, b) => b.publishedAt - a.publishedAt)
  const top = all.slice(0, max)
  const existing = new Set((await (await news()).find({ url: { $in: top.map((t) => t.url) } }, { projection: { url: 1 } }).toArray()).map((d) => d.url))
  return {
    candidates: top.map((c) => ({ ...c, inDatabase: existing.has(c.url) })),
    failed,
  }
}
