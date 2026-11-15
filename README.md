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
Producción: **https://caliche-news.vercel.app**

### 1. Variables en Vercel
En **caliche-news → Settings → Environment Variables** (entorno *Production*) deben estar:

| Variable | Valor |
|---|---|
| `MONGODB_URI` | Cadena de conexión de MongoDB Atlas |
| `MONGODB_DB` | `caliche-news` |
| `API_KEY` | Clave para escribir por la API REST (`openssl rand -hex 32`) |
| `MCP_SECRET` | Clave del conector MCP (`openssl rand -hex 32`) |

Las variables nuevas solo aplican en el **siguiente deploy**: después de agregarlas haz `git push` o **Redeploy**.
En Atlas, **Network Access** debe permitir `0.0.0.0/0` (Vercel no tiene IP fija).

### 2. Probar el MCP antes de conectarlo
```sh
curl -s -X POST https://caliche-news.vercel.app/mcp/TU_MCP_SECRET \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"prueba","version":"1"}}}'
```
Debe responder con `"serverInfo":{"name":"caliche-news"...}`.

### 3. Conectarlo en Claude
1. **Configuración → Conectores → Agregar conector personalizado.**
2. Nombre: `Caliche News`
3. URL: `https://caliche-news.vercel.app/mcp/TU_MCP_SECRET` (la clave va al final de la URL).
4. Si dice que no encontró cómo iniciar sesión: **Continuar de todas formas** y elige **sin autenticación**
   (este MCP no usa OAuth; la clave de la URL es la protección).
5. Abre un **chat nuevo** para que aparezcan las herramientas y pide **"actualiza las noticias"**.

### Errores comunes
| Lo que ves | Causa | Solución |
|---|---|---|
| **404** al conectar | Falta la clave en la URL, o el deploy no tiene `api/mcp.js` | Usa `/mcp/TU_MCP_SECRET` y revisa que el último deploy sea del commit actual |
| **"Clave del MCP incorrecta"** (403) | La clave de la URL no es igual a `MCP_SECRET` en Vercel | Copia la misma clave y vuelve a publicar si la cambiaste |
| **"No se pudo registrar con el servicio de inicio de sesión"** | Una versión vieja respondía 401 y Claude intentaba OAuth | Publica la versión actual (responde 403) y vuelve a agregar el conector |
| **"Falta MONGODB_URI"** o error de conexión | Variables faltantes o Atlas bloquea la IP | Revisa el paso 1 |

### Cómo trabaja Claude
Por cada categoría llama a `get_candidates` (el servidor lee los RSS de `api/_lib/sources.js`), elige las más
relevantes, limpia los títulos, escribe un resumen breve en español con sus palabras y guarda con `save_news`
(si no hay imagen, se toma la portada del artículo). Las instrucciones completas están en `api/_lib/mcpTools.js`.

Herramientas: `get_candidates`, `save_news`, `list_news`, `get_status`, `set_saved`, `delete_news`.
`get_candidates` devuelve `failedFeeds` con las fuentes que no respondieron, para cambiarlas en `sources.js`.
