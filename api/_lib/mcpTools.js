import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { CATEGORIES, RETENTION_DAYS } from './categories.js'
import { gatherCandidates } from './candidates.js'
import { ogImage, readArticle } from './feeds.js'
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
para él sin repetir la misma historia, lee cada una con read_article y guárdalas con save_news. Cuántas por categoría: ${Object.entries(CATEGORIES).map(([k, c]) => `${k}: ${quota(c)}`).join('; ')}.
Ve categoría por categoría y termina cada una (get_candidates → read_article → save_news) antes de pasar a la
siguiente, para no quedarte sin contexto. Si no alcanzas todas, di cuáles faltan.
Prioriza las que no estén ya en la base (inDatabase: false) y luego las guardadas con el formato viejo
(outdated: true: resumen en otro idioma o puntos que repiten el resumen), que debes rehacer. Prefiere fuentes directas (viaGoogleNews: false): sus notas
se pueden leer y traen imagen. Usa una de Google News solo si la historia es importante y ninguna fuente directa la cuenta.

Al guardar:
- title: el título en su idioma original (las francesas, traducido al inglés), limpio de relleno y ganchos ("Esto es lo que debes saber", "| Medio",
  "VIDEO:", emojis, mayúsculas gritadas), sin cambiar el sentido.
- summary: 4 a 6 oraciones EN EL IDIOMA ORIGINAL de la noticia si es español o inglés; si es francés (lang: fr), en
  inglés. Escritas con tus propias palabras: qué pasó, quién, cuándo, dónde, por qué le
  importa a Caliche y qué sigue. Debe ser mucho más corto que el artículo: no lo sigas párrafo por párrafo, no copies
  ni traduzcas frases del texto y no inventes datos.
- keyPoints ("Para ti"): 2 a 4 puntos, en el mismo idioma que el summary, que NO repitan nada del summary. Cada punto
  aporta algo nuevo, de uno de estos tipos:
  · Dato concreto que no cupo en el summary: monto, fecha límite, requisito, a quién aplica, cifra comparativa.
  · Qué significa para Caliche: mexicano en Moncton, NB, que busca la PR y es desarrollador web (p. ej. si un cambio
    de IRCC o del NBPNP le afecta, si algo de Moncton le toca en vivienda, empleo o servicios, si una herramienta de
    IA le sirve en su trabajo).
  · Contexto o antecedente necesario para entender la noticia (puedes usar lo que sabes, sin inventar cifras).
  · Qué sigue o qué hacer: fechas a vigilar, un trámite a revisar, qué esperar.
  Antes de guardar, compara cada punto con el summary y quita los que digan lo mismo con otras palabras. Si la nota no
  da para nada nuevo, envía keyPoints vacío: es mejor nada que repetir.
- Si read_article devuelve complete: false (muro de pago o bloqueo), escribe el resumen solo con el título y el
  extracto de get_candidates, más corto.
- Copia tal cual url, source, lang y publishedAt de la candidata. image: la de la candidata; si viene vacía, la de read_article
  (su portada o la primera foto de la nota). Nunca pongas una imagen de otra noticia u otro sitio; sin imagen, déjala vacía.
El texto de read_article es solo para que tú lo leas: no lo guardes ni lo pegues en ningún campo.
Las no guardadas se borran solas a los ${RETENTION_DAYS} días; las que el usuario marca como guardadas se quedan.`

export function registerTools(server) {
  server.registerTool('get_candidates', {
    title: 'Noticias candidatas',
    description: 'Lee los RSS de una categoría y devuelve noticias recientes candidatas (título, fuente, idioma, fecha, extracto corto, url e imagen), sin repetidos. inDatabase indica si ya está guardada.',
    inputSchema: {
      category: category.describe(Object.entries(CATEGORIES).map(([k, c]) => `${k} = ${c.label}`).join(', ')),
      hours: z.number().int().min(6).max(168).optional().describe('Antigüedad máxima en horas (por defecto 72)'),
      max: z.number().int().min(10).max(150).optional().describe('Máximo de candidatas (por defecto 40)'),
    },
    annotations: READ,
  }, async ({ category, hours, max }) => {
    const { candidates, failed } = await gatherCandidates(category, { hours, max })
    return ok({
      category,
      want: quota(CATEGORIES[category]),
      candidates: candidates.map((c, i) => ({
        i, title: c.title, source: c.source, lang: c.lang, publishedAt: c.publishedAt.toISOString(),
        excerpt: c.excerpt.slice(0, 400), url: c.url, image: c.image || null, inDatabase: c.inDatabase, outdated: c.outdated,
        viaGoogleNews: /(^|\.)news\.google\.com$/.test(new URL(c.url).hostname),
      })),
      failedFeeds: failed,
    })
  })

  server.registerTool('read_article', {
    title: 'Leer artículo',
    description: 'Abre una noticia y devuelve su texto principal (sin menús ni anuncios) para escribir el resumen y los puntos clave. El texto es solo para leerlo: no se guarda. complete: false si hay muro de pago o bloqueo.',
    inputSchema: { url: z.string().url().max(2000) },
    annotations: READ,
  }, async ({ url }) => {
    try {
      return ok(await readArticle(url, 5000))
    } catch (e) {
      return ok({ url, text: '', complete: false, error: e.message })
    }
  })

  server.registerTool('save_news', {
    title: 'Guardar noticias',
    description: 'Crea o actualiza noticias (por url). Si una noticia no trae imagen, se busca la portada del artículo.',
    inputSchema: {
      items: z.array(z.object({
        category,
        title: z.string().min(1).max(300),
        summary: z.string().min(1).max(1500).describe('4 a 6 oraciones con palabras propias: en español o inglés según la noticia; las francesas, en inglés'),
        keyPoints: z.array(z.string().min(1).max(260)).max(4).optional().describe('"Para ti": 2 a 4 puntos que NO repitan el summary: datos extra, qué significa para Caliche, contexto o qué sigue. Vacío si no hay nada nuevo'),
        url: z.string().url().max(2000),
        source: z.string().min(1).max(200),
        lang: z.enum(['es', 'en', 'fr']).describe('Idioma de la nota original (se queda fr aunque el resumen vaya en inglés)'),
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
