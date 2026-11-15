import { MongoClient } from 'mongodb'

// Un solo cliente por instancia de función (Vercel reutiliza instancias entre peticiones).
let clientPromise
let indexesReady

// Lecturas: solo la conexión. Escrituras (withIndexes = true): también se aseguran los índices,
// una vez por instancia. Revisarlos en cada lectura costaba varios viajes a Atlas por petición.
export async function getDb({ withIndexes = false } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI')
  clientPromise ??= new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 5,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8000,
  }).connect().catch((e) => { clientPromise = undefined; throw e })
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'caliche-news')
  if (withIndexes) {
    indexesReady ??= ensureIndexes(db).catch((e) => { indexesReady = undefined; throw e })
    await indexesReady
  }
  return db
}

export async function news(opts) {
  return (await getDb(opts)).collection('news')
}

async function ensureIndexes(db) {
  const c = db.collection('news')
  await Promise.all([
    c.createIndex({ url: 1 }, { unique: true }),
    c.createIndex({ category: 1, lang: 1, publishedAt: -1 }),
    c.createIndex({ saved: 1, publishedAt: -1 }),
    // TTL: MongoDB borra el documento cuando pasa expiresAt. Las guardadas no tienen expiresAt.
    c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    // Búsqueda en español/inglés sobre título, resumen y fuente.
    c.createIndex(
      { title: 'text', summary: 'text', source: 'text' },
      { name: 'search', default_language: 'none', weights: { title: 5, summary: 2, source: 1 } },
    ),
  ])
}
