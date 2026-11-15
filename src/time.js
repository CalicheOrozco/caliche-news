const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const full = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', hour12: true })

// "hace 3 horas", "ayer"... y la fecha completa para el tooltip.
export function relative(iso) {
  const d = new Date(iso)
  const s = (d.getTime() - Date.now()) / 1000
  const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month']]
  let v = s
  for (const [n, unit] of steps) {
    if (Math.abs(v) < n) return rtf.format(Math.round(v), unit)
    v /= n
  }
  return rtf.format(Math.round(v), 'year')
}
export const fullDate = (iso) => full.format(new Date(iso))
