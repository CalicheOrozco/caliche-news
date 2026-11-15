import { MongoClient } from 'mongodb'

// Un solo cliente por instancia de función (Vercel reutiliza instancias entre peticiones).
let clientPromise
let indexesReady

export async function getDb() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI')
  clientPromise ??= new MongoClient(process.env.MONGODB_URI).connect()
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'caliche-news')
  indexesReady ??= ensureIndexes(db)
  await indexesReady
  return db
}

export async function news() {
  return (await getDb()).collection('news')
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
