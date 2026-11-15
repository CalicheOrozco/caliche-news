import { news } from './_lib/db.js'
import { send } from './_lib/http.js'

// Cuántas noticias hay por categoría (y cuántas guardadas), para los contadores de las pestañas.
export default async function handler(req, res) {
  try {
    const col = await news()
    const [rows, saved] = await Promise.all([
      col.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]).toArray(),
      col.countDocuments({ saved: true }),
    ])
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300')
    send(res, 200, { categories: Object.fromEntries(rows.map((r) => [r._id, r.n])), saved })
  } catch (e) {
    send(res, 500, { error: e.message })
  }
}
