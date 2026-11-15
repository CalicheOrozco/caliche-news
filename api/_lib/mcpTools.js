import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { CATEGORIES, RETENTION_DAYS } from './categories.js'
import { gatherCandidates } from './candidates.js'
import { ogImage } from './feeds.js'
import { upsertItems } from './store.js'
import { news } from './db.js'
import { expiry, publicItem } from './http.js'

const READ = { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
const DESTROY = { readOnlyHint: false, destructiveHint: true, openWorldHint: false }

const category = z.enum(Object.keys(CATEGORIES))
const id = z.string().regex(/^[0-9a-f]{24}$/, 'Usa el id de list_news')

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 1) }], structuredContent: data })
const fail = (msg) => ({ content: [{ type: 'text', text: msg }], isError: true })

const quota = (c) => c.perLang
  ? Object.entries(c.perLang).map(([l, n]) => `${n} en "${l}"`).join(' + ')
  : `${c.total} en total`

export const INSTRUCTIONS = `Caliche News guarda noticias personales para Caliche: mexicano que vive en Moncton, New Brunswick,
busca la residencia permanente de Canadá, trabaja en desarrollo web y le interesan la IA y la tecnología.

Para actualizar las noticias, por cada categoría: llama a get_candidates, elige las más relevantes e importantes
para él sin repetir la misma historia, y guárdalas con save_news. Cuántas por categoría: ${Object.entries(CATEGORIES).map(([k, c]) => `${k}: ${quota(c)}`).join('; ')}.
Prioriza las que no estén ya en la base (inDatabase: false).

Al guardar:
- title: el título en su idioma original, limpio de relleno y ganchos ("Esto es lo que debes saber", "| Medio",
  "VIDEO:", emojis, mayúsculas gritadas), sin cambiar el sentido.
- summary: 3 a 5 oraciones en español, con tus propias palabras, con los hechos clave (qué, quién, cuándo, dónde) y
  por qué le importa a Caliche. Usa solo el título y el extracto que devuelve get_candidates. No copies frases del
  extracto ni del artículo y no inventes datos; si el extracto da poco, el resumen es más corto.
- keyPoints: 2 a 4 puntos clave en español, cada uno de una línea (cifras, fechas, requisitos, a quién afecta), con
  tus palabras y solo con datos del título y el extracto. Si no hay datos suficientes, envía menos o ninguno.
- Copia tal cual url, source, lang, publishedAt e image de la candidata.
Las no guardadas se borran solas a los ${RETENTION_DAYS} días; las que el usuario marca como guardadas se quedan.`

export function registerTools(server) {
  server.registerTool('get_candidates', {
    title: 'Noticias candidatas',
    description: 'Lee los RSS de una categoría y devuelve noticias recientes candidatas (título, fuente, idioma, fecha, extracto corto, url e imagen), sin repetidos. inDatabase indica si ya está guardada.',
    inputSchema: {
      category: category.describe(Object.entries(CATEGORIES).map(([k, c]) => `${k} = ${c.label}`).join(', ')),
      hours: z.number().int().min(6).max(168).optional().describe('Antigüedad máxima en horas (por defecto 72)'),
      max: z.number().int().min(10).max(150).optional().describe('Máximo de candidatas (por defecto 80)'),
    },
    annotations: READ,
  }, async ({ category, hours, max }) => {
    const { candidates, failed } = await gatherCandidates(category, { hours, max })
    return ok({
      category,
      want: quota(CATEGORIES[category]),
      candidates: candidates.map((c, i) => ({
        i, title: c.title, source: c.source, lang: c.lang, publishedAt: c.publishedAt.toISOString(),
        excerpt: c.excerpt.slice(0, 1000), url: c.url, image: c.image || null, inDatabase: c.inDatabase,
      })),
      failedFeeds: failed,
    })
  })

  server.registerTool('save_news', {
    title: 'Guardar noticias',
    description: 'Crea o actualiza noticias (por url). Si una noticia no trae imagen, se busca la portada del artículo.',
    inputSchema: {
      items: z.array(z.object({
        category,
        title: z.string().min(1).max(300),
        summary: z.string().min(1).max(1500).describe('3 a 5 oraciones en español, con palabras propias'),
        keyPoints: z.array(z.string().min(1).max(220)).max(4).optional().describe('2 a 4 puntos clave en español, una línea cada uno'),
        url: z.string().url().max(2000),
        source: z.string().min(1).max(200),
        lang: z.enum(['es', 'en', 'fr']),
        publishedAt: z.string().describe('Fecha ISO de la candidata'),
        image: z.string().url().max(2000).nullable().optional(),
      })).min(1).max(100),
    },
    annotations: WRITE,
  }, async ({ items }) => {
    await Promise.all(items.map(async (it) => { if (!it.image) it.image = await ogImage(it.url) }))
    return ok(await upsertItems(items))
  })

  server.registerTool('list_news', {
    title: 'Ver noticias',
    description: 'Lista las noticias guardadas en la base, de la más nueva a la más vieja. Filtros opcionales.',
    inputSchema: {
      category: category.optional(),
      lang: z.enum(['es', 'en', 'fr']).optional(),
      q: z.string().max(200).optional().describe('Búsqueda en título, resumen y fuente'),
      saved: z.boolean().optional().describe('true: solo las guardadas por el usuario'),
      limit: z.number().int().min(1).max(100).optional(),
    },
    annotations: { ...READ, openWorldHint: false },
  }, async ({ category, lang, q, saved, limit = 30 }) => {
    const filter = {}
    if (category) filter.category = category
    if (lang) filter.lang = lang
    if (saved) filter.saved = true
    if (q) filter.$text = { $search: q }
    const docs = await (await news()).find(filter).sort({ publishedAt: -1 }).limit(limit).toArray()
    return ok({ count: docs.length, items: docs.map(publicItem) })
  })

  server.registerTool('get_status', {
    title: 'Estado',
    description: 'Cuántas noticias hay por categoría e idioma, cuántas guardadas y la última actualización.',
    inputSchema: {},
    annotations: { ...READ, openWorldHint: false },
  }, async () => {
    const c = await news()
    const byCat = await c.aggregate([{ $group: { _id: { category: '$category', lang: '$lang' }, n: { $sum: 1 }, last: { $max: '$updatedAt' } } }]).toArray()
    return ok({
      saved: await c.countDocuments({ saved: true }),
      total: await c.estimatedDocumentCount(),
      byCategory: byCat.map((r) => ({ ...r._id, count: r.n, lastUpdate: r.last })),
    })
  })

  server.registerTool('set_saved', {
    title: 'Guardar / quitar de guardadas',
    description: 'saved true: la noticia ya no se borra. false: vuelve a borrarse en 7 días.',
    inputSchema: { id, saved: z.boolean() },
    annotations: WRITE,
  }, async ({ id, saved }) => {
    const update = saved
      ? { $set: { saved: true, savedAt: new Date() }, $unset: { expiresAt: '' } }
      : { $set: { saved: false, expiresAt: expiry() }, $unset: { savedAt: '' } }
    const doc = await (await news()).findOneAndUpdate({ _id: new ObjectId(id) }, update, { returnDocument: 'after' })
    return doc ? ok(publicItem(doc)) : fail('No existe esa noticia')
  })

  server.registerTool('delete_news', {
    title: 'Borrar noticia',
    description: 'Borra una noticia de la base.',
    inputSchema: { id },
    annotations: DESTROY,
  }, async ({ id }) => {
    const r = await (await news()).deleteOne({ _id: new ObjectId(id) })
    return r.deletedCount ? ok({ deleted: true }) : fail('No existe esa noticia')
  })
}
