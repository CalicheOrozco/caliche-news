import { news } from './_lib/db.js'
import { send } from './_lib/http.js'

export default async function handler(req, res) {
  try {
    const total = await (await news({ withIndexes: true })).estimatedDocumentCount()
    send(res, 200, { ok: true, total })
  } catch (e) {
    send(res, 500, { ok: false, error: e.message })
  }
}
