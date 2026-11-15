// GET /api/kindle?per=3  → texto plano para el panel del Kindle (busybox awk no lee JSON).
// Una línea por noticia:  N|categoria|Etiqueta|idioma|YYYY-MM-DDTHH:MMZ|fuente|título|resumen|puntos (separados por " ~ ")
import { news } from './_lib/db.js'
import { CATEGORIES } from './_lib/categories.js'

const flat = (s = '') => String(s).replace(/[|\r\n]+/g, ' ').trim()

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  try {
    const per = Math.min(Math.max(parseInt(req.query.per) || 3, 1), 20)
    const c = await news()
    const lines = []
    for (const [id, cat] of Object.entries(CATEGORIES)) {
      const docs = await c.find({ category: id }).sort({ publishedAt: -1 }).limit(per).toArray()
      for (const d of docs) {
        const when = d.publishedAt ? d.publishedAt.toISOString().slice(0, 16) + 'Z' : ''
        lines.push(['N', id, cat.label, d.lang, when, flat(d.source), flat(d.title), flat(d.summary),
          (d.keyPoints || []).map((k) => flat(k).replace(/~/g, '-')).join(' ~ ')].join('|'))
      }
    }
    res.status(200).end(lines.join('\n') + '\n')
  } catch (e) {
    res.status(500).end('E|' + flat(e.message) + '\n')
  }
}
