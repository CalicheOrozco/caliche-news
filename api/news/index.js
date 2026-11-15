// GET  /api/news?category=ia&lang=es&q=texto&saved=1&limit=50&before=<ISO>  → lista (público)
// POST /api/news  { items: [...] }  → crea o actualiza por url (requiere clave)
import { news } from '../_lib/db.js'
import { send, requireKey, publicItem } from '../_lib/http.js'
import { upsertItems } from '../_lib/store.js'
import { CATEGORIES } from '../_lib/categories.js'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await list(req, res)
    if (req.method === 'POST') return requireKey(req, res) && (await upsertMany(req, res))
    res.setHeader('Allow', 'GET, POST')
    send(res, 405, { error: 'Método no permitido' })
  } catch (e) {
    send(res, 500, { error: e.message })
  }
}

async function list(req, res) {
  const { category, lang, q, saved, before } = req.query
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200)
  const filter = {}
  if (category) {
    if (!CATEGORIES[category]) return send(res, 400, { error: 'Categoría desconocida' })
    filter.category = category
  }
  if (lang) filter.lang = lang
  if (saved === '1' || saved === 'true') filter.saved = true
  if (before) filter.publishedAt = { $lt: new Date(before) }
  if (q && q.trim()) filter.$text = { $search: q.trim() }

  const c = await news()
  const cursor = c.find(filter, q ? { projection: { score: { $meta: 'textScore' } } } : {})
    .sort(q ? { score: { $meta: 'textScore' }, publishedAt: -1 } : { publishedAt: -1 })
    .limit(limit)
  const items = (await cursor.toArray()).map(({ score, ...d }) => publicItem(d))
  send(res, 200, { count: items.length, items })
}

async function upsertMany(req, res) {
  const items = Array.isArray(req.body?.items) ? req.body.items : null
  if (!items?.length) return send(res, 400, { error: 'Envía { items: [...] }' })
  if (items.length > 500) return send(res, 400, { error: 'Máximo 500 por petición' })
  send(res, 200, await upsertItems(items))
}
