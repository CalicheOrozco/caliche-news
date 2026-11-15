// Service worker de Caliche News: abre al instante y funciona sin red con lo último que se vio.
// - Páginas y archivos de la app: se sirven del caché y se actualizan en segundo plano.
// - /api/news, /api/counts, /api/categories: red primero (noticias frescas); sin red, la última respuesta.
// - Imágenes de las noticias: caché, con un máximo de entradas.
const VERSION = 'v1'
const SHELL = `shell-${VERSION}`, API = `api-${VERSION}`, IMG = `img-${VERSION}`
const MAX_IMAGES = 150

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![SHELL, API, IMG].includes(k)) await caches.delete(k)
    await self.clients.claim()
  })())
})

async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys()
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await c.delete(k)
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return  // guardar/quitar siempre va a la red
  const url = new URL(req.url)

  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    if (!/^\/api\/(news|counts|categories)/.test(url.pathname)) return
    e.respondWith((async () => {
      const c = await caches.open(API)
      try {
        const res = await fetch(req)
        if (res.ok) c.put(req, res.clone())
        return res
      } catch {
        return (await c.match(req)) || new Response(JSON.stringify({ error: 'Sin conexión', items: [] }), {
          status: 503, headers: { 'Content-Type': 'application/json' },
        })
      }
    })())
    return
  }

  if (req.destination === 'image' && url.origin !== location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(IMG), hit = await c.match(req)
      if (hit) return hit
      try {
        const res = await fetch(req)
        if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trim(IMG, MAX_IMAGES) }
        return res
      } catch { return Response.error() }
    })())
    return
  }

  if (url.origin === location.origin) {
    // La app: caché al instante y actualización en segundo plano (navegaciones → index).
    const key = req.mode === 'navigate' ? '/' : req
    e.respondWith((async () => {
      const c = await caches.open(SHELL), hit = await c.match(key)
      const fresh = fetch(req).then((res) => { if (res.ok) c.put(key, res.clone()); return res }).catch(() => null)
      return hit || (await fresh) || new Response('Sin conexión', { status: 503 })
    })())
  }
})
