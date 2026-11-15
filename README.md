# Caliche News

Noticias personales en 6 categorías (IA, Tecnología, México, Moncton/NB, Migración a Canadá, Canadá).
Frontend React + Vite + Tailwind y API en `/api` (funciones de Vercel) en el mismo proyecto, con MongoDB Atlas.

## Puesta en marcha
1. Node 26 (LTS): `nvm use` (lee `.nvmrc`).
2. `npm install`
3. Copia `.env.example` a `.env.local` y llena `MONGODB_URI`, `MONGODB_DB` y `API_KEY`.
4. `npm start` (usa `vercel dev`: levanta el frontend y la API juntos en http://localhost:3000).
   `npm run dev` levanta solo el frontend (Vite), sin la API.
   La primera vez te pedirá iniciar sesión en Vercel y vincular el proyecto.

## API
| Método | Ruta | Clave | Qué hace |
|---|---|---|---|
| GET | `/api/health` | – | Comprueba la conexión a MongoDB |
| GET | `/api/categories` | – | Lista de categorías |
| GET | `/api/news?category=&lang=&q=&saved=1&limit=&before=` | – | Lista / búsqueda |
| POST | `/api/news` `{ items: [...] }` | Sí | Crea o actualiza por `url` |
| GET | `/api/news/:id` | – | Una noticia |
| PUT / PATCH | `/api/news/:id` | Sí | Edita |
| DELETE | `/api/news/:id` | Sí | Borra |
| PATCH | `/api/news/:id/save` `{ saved: true/false }` | – | Guardar / quitar de guardadas |
| GET | `/api/kindle?per=3` | – | Texto plano para el panel del Kindle |

La clave va en la cabecera `Authorization: Bearer <API_KEY>`.

## Noticia
`{ title, summary, url, source, category, lang (es/en/fr), publishedAt, addedAt, updatedAt, saved, expiresAt }`

Las no guardadas tienen `expiresAt` = 7 días después de agregarse y MongoDB las borra solo (índice TTL).
Al guardarlas se quita `expiresAt` y se quedan para siempre.

## Automatización con Claude (MCP)
Claude actualiza las noticias a través del servidor MCP del proyecto (`api/mcp.js`). No usa la API de Anthropic.

1. En Vercel agrega la variable `MCP_SECRET` (una clave larga) y publica.
2. En Claude: Configuración → Conectores → Agregar conector personalizado, con la URL
   `https://<tu-dominio>/mcp/<MCP_SECRET>`.
3. Pide "actualiza las noticias" (o deja una tarea programada). Claude llama a `get_candidates` por categoría
   (tu servidor lee los RSS de `api/_lib/sources.js`), elige, limpia los títulos, escribe un resumen breve en
   español y guarda con `save_news` (si no hay imagen, se toma la portada del artículo).

Herramientas: `get_candidates`, `save_news`, `list_news`, `get_status`, `set_saved`, `delete_news`.
`get_candidates` devuelve `failedFeeds` con las fuentes que no respondieron, para cambiarlas en `sources.js`.
