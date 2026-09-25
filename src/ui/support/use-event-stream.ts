'use client'

import { useEffect, useRef, useState } from 'react'

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'offline'

/**
 * Un stream de Server-Sent Events que se mantiene solo:
 *  · cada vez que (re)conecta llama a `onOpen` (para pedir el estado
 *    completo: lo que pasó mientras estaba desconectado no se pierde);
 *  · si el servidor corta (lo hace a propósito cada ~50 s) o falla, vuelve a
 *    conectar con espera creciente;
 *  · con la pestaña oculta se desconecta (`pauseWhenHidden`) y al volver
 *    reconecta y se pone al día;
 *  · sin EventSource (navegadores muy viejos), consulta cada 5 s.
 */
export function useEventStream<T>(
  url: string | null,
  handlers: { onEvent(event: T): void; onOpen?(): void },
  { pauseWhenHidden = true }: { pauseWhenHidden?: boolean } = {},
): StreamStatus {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!pauseWhenHidden) return
    const update = () => setVisible(document.visibilityState !== 'hidden')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [pauseWhenHidden])

  const active = Boolean(url) && visible

  useEffect(() => {
    if (!url || !active) return
    let source: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let poll: ReturnType<typeof setInterval> | undefined
    let attempts = 0
    let disposed = false

    if (typeof EventSource === 'undefined') {
      latest.current.onOpen?.()
      poll = setInterval(() => latest.current.onOpen?.(), 5_000)
      return () => clearInterval(poll)
    }

    const connect = () => {
      if (disposed) return
      setStatus(attempts === 0 ? 'connecting' : 'offline')
      source = new EventSource(url)
      source.onopen = () => {
        attempts = 0
        setStatus('open')
        latest.current.onOpen?.()
      }
      source.onmessage = (message) => {
        try {
          latest.current.onEvent(JSON.parse(message.data) as T)
        } catch {
          // Un evento mal formado no corta el stream.
        }
      }
      source.onerror = () => {
        // Si el navegador ya lo va a reintentar solo (CONNECTING), se lo deja.
        if (source?.readyState !== EventSource.CLOSED) {
          setStatus('offline')
          return
        }
        source.close()
        attempts += 1
        setStatus('offline')
        retry = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** Math.min(attempts, 5)))
      }
    }
    connect()

    return () => {
      disposed = true
      clearTimeout(retry)
      source?.close()
      setStatus('idle')
    }
  }, [url, active])

  return status
}
