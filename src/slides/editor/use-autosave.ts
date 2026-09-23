'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SaveResult } from './contract'
import type { EditorDraft } from './draft'

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export interface AutosaveStatus {
  state: SaveState
  savedAt: Date | null
  error: string | null
}

/**
 * Guardado automático del borrador: cada cambio agenda un guardado a los
 * `delay` ms del último; nunca hay dos guardados en vuelo, y lo que cambió
 * mientras se guardaba sale en el siguiente. Si se cierra la pestaña con
 * cambios sin guardar, el navegador pregunta.
 */
export function useAutosave(save: (draft: EditorDraft) => Promise<SaveResult>, delay = 1200) {
  const [status, setStatus] = useState<AutosaveStatus>({
    state: 'saved',
    savedAt: null,
    error: null,
  })
  const run = useRef({
    latest: null as EditorDraft | null,
    version: 0,
    saved: 0,
    timer: undefined as number | undefined,
    inflight: null as Promise<boolean> | null,
  })

  /** Guarda ya lo pendiente. true = quedó todo guardado. */
  const flush = useCallback(async (): Promise<boolean> => {
    const r = run.current
    window.clearTimeout(r.timer)
    // Si hubo cambios mientras se guardaba, se vuelve a guardar hasta quedar al día.
    while (true) {
      if (r.inflight) await r.inflight
      if (r.version === r.saved || !r.latest) return true

      const version = r.version
      const draft = r.latest
      setStatus((s) => ({ ...s, state: 'saving' }))
      r.inflight = save(draft)
        .catch((): SaveResult => ({ ok: false, error: 'Sin conexión. Revisá tu internet.' }))
        .then((result) => {
          if (!result.ok) {
            setStatus((s) => ({ ...s, state: 'error', error: result.error }))
            return false
          }
          r.saved = Math.max(r.saved, version)
          setStatus({
            state: r.version === r.saved ? 'saved' : 'dirty',
            savedAt: new Date(result.savedAt),
            error: null,
          })
          return true
        })
        .finally(() => {
          r.inflight = null
        })
      if (!(await r.inflight)) return false
    }
  }, [save])

  /** Registrar un cambio: se guarda solo, a los `delay` ms. */
  const schedule = useCallback(
    (draft: EditorDraft) => {
      const r = run.current
      r.latest = draft
      r.version += 1
      setStatus((s) => (s.state === 'dirty' ? s : { ...s, state: 'dirty' }))
      window.clearTimeout(r.timer)
      r.timer = window.setTimeout(() => void flush(), delay)
    },
    [delay, flush],
  )

  useEffect(() => {
    const r = run.current
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (r.version !== r.saved) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.clearTimeout(r.timer)
    }
  }, [])

  return { status, schedule, flush }
}
