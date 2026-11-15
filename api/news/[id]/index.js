// GET    /api/news/:id          → una noticia (público)
// PUT    /api/news/:id  {...}   → reemplaza los campos editables (requiere clave)
// PATCH  /api/news/:id  {...}   → cambia solo los campos enviados (requiere clave)
// DELETE /api/news/:id          → borra (requiere clave)
import { news } from '../../_lib/db.js'
import { send, requireKey, toId, cleanItem, publicItem } from '../../_lib/http.js'

const EDITABLE = ['title', 'summary', 'url', 'source', 'category', 'lang', 'publishedAt', 'image', 'keyPoints']

export default async function handler(req, res) {
  try {
    const _id = toId(req.query.id)
    if (!_id) return send(res, 400, { error: 'id inválido' })
    const c = await news()

    if (req.method === 'GET') {
      const doc = await c.findOne({ _id })
      return doc ? send(res, 200, publicItem(doc)) : send(res, 404, { error: 'No existe' })
    }
    if (!requireKey(req, res)) return

    if (req.method === 'DELETE') {
      const r = await c.deleteOne({ _id })
      return r.deletedCount ? send(res, 200, { deleted: true }) : send(res, 404, { error: 'No existe' })
    }
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || {}
      let set
      if (req.method === 'PUT') {
        const { item, errors } = cleanItem(body)
        if (errors.length) return send(res, 400, { error: 'Faltan o son inválidos', missing: errors })
        set = item
      } else {
        const current = await c.findOne({ _id })
        if (!current) return send(res, 404, { error: 'No existe' })
        const { item, errors } = cleanItem({ ...current, ...pick(body) })
        if (errors.length) return send(res, 400, { error: 'Inválidos', missing: errors })
        set = item
      }
      const doc = await c.findOneAndUpdate({ _id }, { $set: { ...set, updatedAt: new Date() } }, { returnDocument: 'after' })
      return doc ? send(res, 200, publicItem(doc)) : send(res, 404, { error: 'No existe' })
    }
    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE')
    send(res, 405, { error: 'Método no permitido' })
  } catch (e) {
    send(res, 500, { error: e.message })
  }
}

function pick(body) {
  return Object.fromEntries(Object.entries(body).filter(([k]) => EDITABLE.includes(k)))
}
