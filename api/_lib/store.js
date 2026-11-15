import { FORMAT } from './candidates.js'
import { news } from './db.js'
import { cleanItem, expiry } from './http.js'

// Crea o actualiza noticias por url. Conserva addedAt, saved y la caducidad de las guardadas.
export async function upsertItems(items) {
  const now = new Date()
  const ops = []
  const rejected = []
  items.forEach((raw, i) => {
    const { item, errors } = cleanItem(raw)
    if (errors.length) return rejected.push({ index: i, url: raw?.url, missing: errors })
    ops.push({
      updateOne: {
        filter: { url: item.url },
        update: [
          { $set: {
              // $literal: un título como "$5 mil millones" no debe leerse como nombre de campo.
              ...Object.fromEntries(Object.entries(item).map(([k, v]) => [k, { $literal: v }])),
              updatedAt: now,
              fmt: FORMAT,
              addedAt: { $ifNull: ['$addedAt', now] },
              saved: { $ifNull: ['$saved', false] },
          } },
          { $set: { expiresAt: { $cond: ['$saved', '$$REMOVE', { $ifNull: ['$expiresAt', expiry(now)] }] } } },
        ],
        upsert: true,
      },
    })
  })
  const r = ops.length ? await (await news({ withIndexes: true })).bulkWrite(ops, { ordered: false }) : null
  return { inserted: r?.upsertedCount ?? 0, updated: r?.modifiedCount ?? 0, rejected }
}
