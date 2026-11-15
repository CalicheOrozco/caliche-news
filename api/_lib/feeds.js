// Lector mínimo de RSS 2.0 y Atom sin dependencias.
const UA = 'Mozilla/5.0 (compatible; CalicheNews/1.0; +https://vercel.com)'

export async function fetchText(url, ms = 8000) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: AbortSignal.timeout(ms), redirect: 'follow' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return await r.text()
}

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

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
      image: imageOf(b, html),
      // Google News pone el medio real en <source>
      origin: stripHtml(tag(b, 'source')),
    })
  }
  return items.filter((i) => i.title && /^https?:\/\//.test(i.url) && i.publishedAt && !isNaN(i.publishedAt))
}

// Imagen de portada del artículo (og:image / twitter:image) cuando el feed no trae.
export async function ogImage(url) {
  try {
    const html = (await fetchText(url, 5000)).slice(0, 200000)
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i)
    const src = m ? decode(m[1]) : ''
    return /^https?:\/\//.test(src) && !/news\.google\.com|gstatic\.com/.test(src) ? src : ''
  } catch {
    return ''
  }
}
