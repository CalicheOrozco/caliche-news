import { ObjectId } from 'mongodb'
import { CATEGORIES, LANGS, RETENTION_DAYS } from './categories.js'

export function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

// Escrituras protegidas con la clave API_KEY (cabecera "Authorization: Bearer <clave>" o "x-api-key").
export function requireKey(req, res) {
  const h = req.headers.authorization || ''
  const key = h.startsWith('Bearer ') ? h.slice(7) : req.headers['x-api-key']
  if (!process.env.API_KEY || key !== process.env.API_KEY) {
    send(res, 401, { error: 'No autorizado' })
    return false
  }
  return true
}

export function toId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null
}

export const expiry = (from = new Date()) => new Date(from.getTime() + RETENTION_DAYS * 864e5)

// Valida y normaliza una noticia que llega de la automatización.
export function cleanItem(raw) {
  const errors = []
  const s = (v) => (typeof v === 'string' ? v.trim() : '')
  const item = {
    title: s(raw.title),
    summary: s(raw.summary),
    url: s(raw.url),
    source: s(raw.source),
    category: s(raw.category),
    lang: s(raw.lang),
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
  }
  if (!item.title) errors.push('title')
  if (!/^https?:\/\//.test(item.url)) errors.push('url')
  if (!item.source) errors.push('source')
  if (!CATEGORIES[item.category]) errors.push('category')
  if (!LANGS.includes(item.lang)) errors.push('lang')
  if (!item.publishedAt || isNaN(item.publishedAt)) errors.push('publishedAt')
  return { item, errors }
}

// Lo que ve el cliente: id en texto en vez de _id.
export function publicItem({ _id, ...rest }) {
  return { id: String(_id), ...rest }
}
