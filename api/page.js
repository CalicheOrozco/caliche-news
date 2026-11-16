// GET /n/:id (vercel.json lo manda aquí) → página de una noticia para compartir.
// WhatsApp, iMessage y demás leen las etiquetas Open Graph (título, resumen e imagen) para la
// vista previa; una persona es enviada al instante a la app, que abre el resumen.
import { news } from './_lib/db.js'
import { toId } from './_lib/http.js'

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export default async function handler(req, res) {
  const id = String(req.query.id || '')
  const app = `/?n=${encodeURIComponent(id)}`
  let doc = null
  try { const _id = toId(id); if (_id) doc = await (await news()).findOne({ _id }) } catch { /* sin base: página genérica */ }
  const host = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  const title = doc ? doc.title : 'Caliche News'
  const desc = doc ? (doc.summary || '').slice(0, 300) : 'Esta noticia ya no está disponible.'
  const meta = [
    ['og:type', 'article'], ['og:site_name', 'Caliche News'], ['og:title', title], ['og:description', desc],
    ['og:url', `${host}/n/${id}`], ...(doc?.image ? [['og:image', doc.image]] : []),
  ].map(([p, c]) => `<meta property="${p}" content="${esc(c)}">`).join('\n  ')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
  res.status(doc ? 200 : 404).end(`<!doctype html>
<html lang="${doc?.lang === 'es' ? 'es' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · Caliche News</title>
  <meta name="description" content="${esc(desc)}">
  ${meta}
  <meta name="twitter:card" content="${doc?.image ? 'summary_large_image' : 'summary'}">
  <meta name="theme-color" content="#09090b">
  <meta http-equiv="refresh" content="0;url=${esc(app)}">
  <script>location.replace(${JSON.stringify(app)})</script>
</head>
<body style="background:#09090b;color:#e4e4e7;font-family:system-ui;padding:2rem">
  <a href="${esc(app)}" style="color:#34d399">${esc(title)}</a>
</body>
</html>`)
}
