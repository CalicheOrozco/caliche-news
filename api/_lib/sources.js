// Fuentes por categoría (RSS/Atom). Si un feed falla, get_candidates (MCP) lo reporta en "failedFeeds"
// y se puede quitar o cambiar aquí sin tocar nada más. lang = idioma de la fuente.
const gnews = (q, hl = 'en-CA', gl = 'CA') =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0]}`

export const SOURCES = {
  ia: [
    { name: 'MIT Technology Review', lang: 'en', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
    { name: 'The Verge', lang: 'en', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
    { name: 'TechCrunch', lang: 'en', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'Ars Technica', lang: 'en', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
    { name: 'VentureBeat', lang: 'en', url: 'https://venturebeat.com/category/ai/feed/' },
    { name: 'Wired', lang: 'en', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
    { name: 'Hacker News', lang: 'en', url: 'https://hnrss.org/newest?q=AI+OR+LLM&points=100' },
    { name: 'Xataka', lang: 'es', url: 'https://feeds.weblogssl.com/xataka2' },
    { name: 'Hipertextual', lang: 'es', url: 'https://hipertextual.com/feed' },
    { name: 'Genbeta', lang: 'es', url: 'https://feeds.weblogssl.com/genbeta' },
    { name: 'Google Noticias (IA)', lang: 'es', url: gnews('inteligencia artificial', 'es-419', 'MX') },
  ],
  tecnologia: [
    { name: 'The Verge', lang: 'en', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'Ars Technica', lang: 'en', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'Engadget', lang: 'en', url: 'https://www.engadget.com/rss.xml' },
    { name: 'TechCrunch', lang: 'en', url: 'https://techcrunch.com/feed/' },
    { name: 'Wired', lang: 'en', url: 'https://www.wired.com/feed/rss' },
    { name: '9to5Mac', lang: 'en', url: 'https://9to5mac.com/feed/' },
    { name: 'Xataka', lang: 'es', url: 'https://feeds.weblogssl.com/xataka2' },
    { name: 'Genbeta', lang: 'es', url: 'https://feeds.weblogssl.com/genbeta' },
    { name: 'Hipertextual', lang: 'es', url: 'https://hipertextual.com/feed' },
  ],
  mexico: [
    { name: 'Animal Político', lang: 'es', url: 'https://animalpolitico.com/feed' },
    { name: 'Aristegui Noticias', lang: 'es', url: 'https://aristeguinoticias.com/feed/' },
    { name: 'Expansión', lang: 'es', url: 'https://expansion.mx/rss' },
    { name: 'El Financiero', lang: 'es', url: 'https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml' },
    { name: 'La Jornada', lang: 'es', url: 'https://www.jornada.com.mx/rss/edicion.xml?v=1' },
    { name: 'El País México', lang: 'es', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/mexico/portada' },
    { name: 'El Universal / Milenio / Proceso (Google Noticias)', lang: 'es', url: gnews('México', 'es-419', 'MX') },
  ],
  moncton: [
    { name: 'CBC New Brunswick', lang: 'en', url: 'https://www.cbc.ca/webfeed/rss/rss-canada-newbrunswick' },
    { name: 'Radio-Canada Acadie', lang: 'fr', url: 'https://ici.radio-canada.ca/info/rss/acadie/en-continu' },
    { name: 'Global News', lang: 'en', url: 'https://globalnews.ca/new-brunswick/feed/' },
    { name: 'Huddle', lang: 'en', url: 'https://huddle.today/feed/' },
    // Respaldo: solo se usa si ninguna fuente directa cuenta la historia (no se puede leer ni trae imagen).
    { name: 'Moncton / NB (Google News)', lang: 'en', url: gnews('Moncton OR "New Brunswick"') },
  ],
  migracion: [
    { name: 'IRCC (Canada.ca)', lang: 'en', url: 'https://api.io.canada.ca/io-server/gc/news/en/v2?dept=departmentofcitizenshipandimmigration&sort=publishedDate&orderBy=desc&pick=30&format=atom' },
    { name: 'CIC News', lang: 'en', url: 'https://www.cicnews.com/feed' },
    { name: 'Moving2Canada', lang: 'en', url: 'https://moving2canada.com/feed/' },
    { name: 'Express Entry / PR (Google News)', lang: 'en', url: gnews('"Express Entry" OR IRCC OR "permanent residence" Canada') },
    { name: 'NBPNP / NB immigration (Google News)', lang: 'en', url: gnews('"New Brunswick" immigration OR "Provincial Nominee" OR NBPNP') },
    { name: 'Migración a Canadá (Google Noticias)', lang: 'es', url: gnews('migrar a Canadá residencia permanente', 'es-419', 'MX') },
  ],
  canada: [
    { name: 'CBC News', lang: 'en', url: 'https://www.cbc.ca/webfeed/rss/rss-canada' },
    { name: 'CBC Politics', lang: 'en', url: 'https://www.cbc.ca/webfeed/rss/rss-politics' },
    { name: 'CBC Business', lang: 'en', url: 'https://www.cbc.ca/webfeed/rss/rss-business' },
    { name: 'Radio-Canada', lang: 'fr', url: 'https://ici.radio-canada.ca/rss/4159' },
    { name: 'Global News', lang: 'en', url: 'https://globalnews.ca/canada/feed/' },
    { name: 'The Globe and Mail', lang: 'en', url: 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/' },
    { name: 'National Post', lang: 'en', url: 'https://nationalpost.com/category/news/canada/feed' },
    { name: 'Canadian Press (Google News)', lang: 'en', url: gnews('"Canadian Press" Canada') },
  ],
  internacional: [
    { name: 'BBC Mundo', lang: 'es', url: 'https://feeds.bbci.co.uk/mundo/rss.xml' },
    { name: 'El País Internacional', lang: 'es', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada' },
    { name: 'DW Español', lang: 'es', url: 'https://rss.dw.com/xml/rss-sp-all' },
    { name: 'CNN en Español', lang: 'es', url: 'https://cnnespanol.cnn.com/feed/' },
    { name: 'BBC World', lang: 'en', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'The Guardian World', lang: 'en', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Al Jazeera', lang: 'en', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'NPR World', lang: 'en', url: 'https://feeds.npr.org/1004/rss.xml' },
    { name: 'AP / Reuters (Google News)', lang: 'en', url: gnews('world news Reuters OR "Associated Press"') },
  ],
}

// Para qué es relevante cada categoría (guía para elegir las noticias).
export const PROFILE = `Lector: mexicano que vive en Moncton, New Brunswick (Canadá), busca la residencia permanente (PR),
trabaja en desarrollo web y le interesan la IA y la tecnología.
- ia: avances, lanzamientos, empresas y regulación de IA; útil para un desarrollador.
- tecnologia: tecnología en general, software, gadgets, Apple, desarrollo web.
- mexico: lo más importante de México (política, economía, seguridad, sociedad).
- moncton: Moncton y New Brunswick: ciudad, vivienda, empleo, clima, servicios, gobierno provincial.
- migracion: IRCC, Express Entry y sus sorteos, PNP de New Brunswick (NBPNP), permisos de trabajo, cambios de reglas y plazos. Prioriza lo que afecta a alguien en NB que busca la PR.
- canada: lo más importante a nivel nacional en Canadá.
- internacional: lo más importante del mundo (geopolítica, conflictos, economía global, EE. UU. y Latinoamérica); sin repetir lo que ya va en México o Canadá.`
