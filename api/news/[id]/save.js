// PATCH /api/news/:id/save  { saved: true|false }  → guarda (nunca se borra) o la devuelve a borrarse en 7 días.
// Sin clave: es el botón de guardar del frontend.
import { news } from '../../_lib/db.js'
import { send, toId, expiry, publicItem } from '../../_lib/http.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'PATCH') { res.setHeader('Allow', 'PATCH'); return send(res, 405, { error: 'Método no permitido' }) }
    const _id = toId(req.query.id)
    if (!_id) return send(res, 400, { error: 'id inválido' })
    const saved = req.body?.saved !== false
    const update = saved
      ? { $set: { saved: true, savedAt: new Date() }, $unset: { expiresAt: '' } }
      : { $set: { saved: false, expiresAt: expiry() }, $unset: { savedAt: '' } }
    const doc = await (await news()).findOneAndUpdate({ _id }, update, { returnDocument: 'after' })
    doc ? send(res, 200, publicItem(doc)) : send(res, 404, { error: 'No existe' })
  } catch (e) {
    send(res, 500, { error: e.message })
  }
}
