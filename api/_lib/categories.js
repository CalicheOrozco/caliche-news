// Categorías. IA y Tecnología llevan 10 en español + 10 en inglés; las demás, 10 en total.
export const CATEGORIES = {
  ia:         { label: 'IA',                 perLang: { es: 10, en: 10 } },
  tecnologia: { label: 'Tecnología',         perLang: { es: 10, en: 10 } },
  mexico:     { label: 'México',             total: 10 },
  moncton:    { label: 'Moncton / NB',       total: 10 },
  migracion:  { label: 'Migración a Canadá', total: 10 },
  canada:     { label: 'Canadá',             total: 10 },
}
export const LANGS = ['es', 'en', 'fr']
export const RETENTION_DAYS = 7  // las no guardadas se borran solas a los 7 días
