// POST /api/news/:id/share  → la marca como compartida: ya no se borra a los 7 días, para que
// el link que mandaste siga funcionando. Sin clave: es el botón de compartir del frontend.
import { news } from '../../_lib/db.js'
import { send, toId, publicItem } from '../../_lib/http.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Método no permitido' }) }
    const _id = toId(req.query.id)
    if (!_id) return send(res, 400, { error: 'id inválido' })
    const doc = await (await news()).findOneAndUpdate(
      { _id },
      { $set: { shared: true, sharedAt: new Date() }, $unset: { expiresAt: '' } },
      { returnDocument: 'after' },
    )
    doc ? send(res, 200, publicItem(doc)) : send(res, 404, { error: 'No existe' })
  } catch (e) {
    send(res, 500, { error: e.message })
  }
}
