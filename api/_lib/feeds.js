// Lector mínimo de RSS 2.0 y Atom sin dependencias.
// Algunos medios (CBC, por ejemplo) rechazan a los lectores que se presentan como bots.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.7'

export async function fetchText(url, ms = 8000) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: ACCEPT, 'Accept-Language': 'en-CA,en;q=0.9,es;q=0.8,fr;q=0.7' }, signal: AbortSignal.timeout(ms), redirect: 'follow' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return await r.text()
}

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

// Enlaces de Google News: su página es una redirección y su "portada" es el logo de Google News.
export const isGoogleNews = (u) => { try { return /(^|\.)news\.google\.com$/.test(new URL(u).hostname) } catch { return false } }
const GOOGLE_IMG = /(^|\.)(googleusercontent\.com|gstatic\.com|google\.com)$/
export const isGoogleImage = (u) => { try { return GOOGLE_IMG.test(new URL(u).hostname) } catch { return false } }

export const stripHtml = (s = '') => decode(decode(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1] : ''
}
const attr = (xml, name, a) => {
  const m = xml.match(new RegExp(`<${name}\\b[^>]*\\b${a}=["']([^"']+)["']`, 'i'))
  return m ? decode(m[1]) : ''
}

function imageOf(block, html) {
  return attr(block, 'media:content', 'url') || attr(block, 'media:thumbnail', 'url')
    || (/<enclosure\b[^>]*type=["']image/i.test(block) ? attr(block, 'enclosure', 'url') : '')
    || (html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '')
}

export function parseFeed(xml) {
  const items = []
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
  for (const b of blocks) {
    const isAtom = /^<entry/i.test(b)
    const rawDesc = tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content')
    const html = decode(rawDesc)
    const link = isAtom ? (attr(b, 'link', 'href') || stripHtml(tag(b, 'link'))) : stripHtml(tag(b, 'link')) || attr(b, 'link', 'href')
    const date = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')
    items.push({
      title: stripHtml(tag(b, 'title')),
      url: link.trim(),
      publishedAt: date ? new Date(stripHtml(date)) : null,
      excerpt: stripHtml(html).slice(0, 1000),
      image: (() => { const i = imageOf(b, html); return isGoogleImage(i) ? '' : i })(),
      // Google News pone el medio real en <source>
      origin: stripHtml(tag(b, 'source')),
    })
  }
  return items.filter((i) => i.title && /^https?:\/\//.test(i.url) && i.publishedAt && !isNaN(i.publishedAt))
}

// Imagen de portada del artículo (og:image / twitter:image) cuando el feed no trae.
export async function ogImage(url) {
  if (isGoogleNews(url)) return ''  // sin portada propia: sería el logo de Google News
  try {
    const html = (await fetchText(url, 5000)).slice(0, 200000)
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i)
    const src = m ? decode(m[1]) : ''
    return /^https?:\/\//.test(src) && !isGoogleImage(src) ? src : ''
  } catch {
    return ''
  }
}

// Texto principal de un artículo, para que Claude lo lea y escriba su resumen. No se guarda en la base.
// Quita scripts, menús, encabezados, pies, barras laterales y formularios; prefiere <article>/<main>
// y se queda con los párrafos (<p>) con texto de verdad.
export async function readArticle(url, maxChars = 8000) {
  // Google News solo redirige con JavaScript: no hay texto ni imagen de la nota.
  if (isGoogleNews(url)) return { url, title: '', description: '', image: '', text: '', complete: false, note: 'Enlace de Google News: usa el extracto' }
  const html = await fetchText(url, 8000)
  const meta = (name) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'))
    return m ? stripHtml(m[1]) : ''
  }
  // Primera foto dentro de la nota (antes de quitar <figure>), por si no hay og:image.
  const firstImage = articleImage(html, url)
  let body = html
    .replace(/<(script|style|noscript|svg|iframe|nav|header|footer|aside|form|figure)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
  const scope = body.match(/<article\b[\s\S]*<\/article>/i)?.[0] || body.match(/<main\b[\s\S]*<\/main>/i)?.[0] || body
  const paras = (scope.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
    .map((p) => stripHtml(p))
    .filter((t) => t.length > 60 && !/^(advertisement|publicidad|suscr[ií]bete|subscribe|sign up|read more|lee también)/i.test(t))
  const text = paras.join('\n\n').slice(0, maxChars)
  return {
    url,
    title: meta('og:title') || stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''),
    description: meta('og:description') || meta('description'),
    image: (() => { const i = meta('og:image') || meta('twitter:image'); return /^https?:\/\//.test(i) && !isGoogleImage(i) ? i : firstImage })(),
    text,
    complete: text.length > 400,  // false: muro de pago, bloqueo o página sin texto (usa el extracto del RSS)
  }
}

// Primera imagen "de contenido" dentro de <article>/<main>: salta logos, íconos, avatares, anuncios,
// píxeles de seguimiento y fotos pequeñas. Resuelve rutas relativas y lazy-load (data-src, srcset).
const SKIP_IMG = /logo|icon|avatar|sprite|badge|banner|ads?[\/_.-]|doubleclick|pixel|tracking|placeholder|blank|spacer|emoji|gravatar|author/i
function articleImage(html, pageUrl) {
  const scope = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] || html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || ''
  for (const tag of scope.match(/<img\b[^>]*>/gi) || []) {
    const get = (a) => tag.match(new RegExp(`\\b${a}=["']([^"']+)["']`, 'i'))?.[1] || ''
    let src = get('data-src') || get('data-lazy-src') || get('data-original') || get('src')
    if (!src || src.startsWith('data:')) src = (get('data-srcset') || get('srcset')).split(',').pop()?.trim().split(/\s+/)[0] || ''
    if (!src || src.startsWith('data:') || /\.svg(\?|$)/i.test(src) || SKIP_IMG.test(src + ' ' + get('class') + ' ' + get('alt'))) continue
    const w = parseInt(get('width')) || 0, h = parseInt(get('height')) || 0
    if ((w && w < 300) || (h && h < 160)) continue
    try { const abs = new URL(decode(src), pageUrl).href; if (!isGoogleImage(abs)) return abs } catch { /* ruta inválida */ }
  }
  return ''
}
