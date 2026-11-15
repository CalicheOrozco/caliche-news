import { useState } from 'react'

// Ícono por categoría para cuando la noticia no trae imagen (o no carga).
const ICONS = {
  ia: <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 5h4v4h-4z" />,
  internacional: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  tecnologia: <path d="M4 5h16v10H4zM2 19h20M9 15v4M15 15v4" />,
  mexico: <path d="M4 21V4m0 0h12l-2 4 2 4H4" />,
  moncton: <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />,
  migracion: <path d="M2 16l20-8-6 13-3-6-6-2 8-3" />,
  canada: <path d="M12 2l2 5 4-1-1 5 4 2-5 2 1 4-5-2-5 2 1-4-5-2 4-2-1-5 4 1z" />,
}

export default function Cover({ item, className = '' }) {
  const [ok, setOk] = useState(Boolean(item.image))
  if (ok) {
    return (
      <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setOk(false)}
        className={`h-full w-full object-cover ${className}`} />
    )
  }
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-900/60 via-zinc-900 to-zinc-950 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-10 w-10 text-emerald-400/70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {ICONS[item.category] || ICONS.tecnologia}
      </svg>
      <span className="px-4 text-center text-sm font-medium text-emerald-100/70">{item.source}</span>
    </div>
  )
}
