// Paso 1: solo comprueba que la API y la base responden. El frontend completo viene en el paso 3.
import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('Conectando…')
  useEffect(() => {
    fetch('/api/health')
      .then(async (r) => {
        const text = await r.text()
        try {
          const d = JSON.parse(text)
          setStatus(d.ok ? `API y MongoDB OK · ${d.total} noticias` : `Error: ${d.error}`)
        } catch {
          // No es JSON: muestra lo que llegó para poder diagnosticar.
          setStatus(`La API respondió ${r.status} sin JSON: ${text.slice(0, 300)}`)
        }
      })
      .catch((e) => setStatus(`Error de red: ${e.message}`))
  }, [])
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Caliche News</h1>
        <p className="mt-2 text-zinc-400">{status}</p>
      </div>
    </main>
  )
}
