import { CATEGORIES, RETENTION_DAYS } from './_lib/categories.js'
import { send } from './_lib/http.js'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600')
  send(res, 200, {
    retentionDays: RETENTION_DAYS,
    categories: Object.entries(CATEGORIES).map(([id, c]) => ({ id, label: c.label })),
  })
}
