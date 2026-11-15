// Llamadas a la API del mismo proyecto.
async function json(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

export const getCounts = () => fetch('/api/counts').then(json)
export const getCategories = () => fetch('/api/categories').then(json)

export function getNews({ category, lang, q, saved, before, limit = 30 } = {}) {
  const p = new URLSearchParams()
  if (category) p.set('category', category)
  if (lang) p.set('lang', lang)
  if (q) p.set('q', q)
  if (saved) p.set('saved', '1')
  if (before) p.set('before', before)
  p.set('limit', limit)
  return fetch(`/api/news?${p}`).then(json)
}

export const setSaved = (id, saved) =>
  fetch(`/api/news/${id}/save`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saved }),
  }).then(json)
