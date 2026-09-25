'use client'

import { useEffect } from 'react'

/**
 * Último recurso: falló el layout raíz. Reemplaza todo el documento, así que
 * no puede depender de nada del sitio (ni fuentes, ni estilos globales).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#fff0f3',
          color: '#2a2433',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 64, margin: 0 }} aria-hidden>
            🎁
          </p>
          <h1 style={{ fontSize: 28, margin: '16px 0 8px' }}>Uy, algo se trabó</h1>
          <p style={{ color: '#6b6272', margin: '0 0 24px' }}>
            No pudimos cargar Boxie. Probá de nuevo en un momento.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#F44E63',
              color: '#fff',
              border: 0,
              borderRadius: 999,
              padding: '14px 28px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#8a8190', marginTop: 16 }}>
              Código: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
