'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/**
 * Avisos de la bandeja cuando llega un mensaje de un cliente: un sonido suave
 * (se arma con Web Audio, sin archivos), una notificación del navegador si la
 * pestaña está oculta y el número de consultas sin leer en el título.
 * Quien atiende los activa con un botón (el navegador pide permiso y el
 * audio solo puede arrancar después de un toque).
 */

const KEY = 'bx-admin-support-alerts'
const listeners = new Set<() => void>()

function readEnabled() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function writeEnabled(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // Sin almacenamiento: vale para esta pestaña.
  }
  listeners.forEach((l) => l())
}

export function useInboxAlerts(unread: number) {
  const enabled = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    readEnabled,
    () => false,
  )
  const audio = useRef<AudioContext | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission),
    )
    return () => cancelAnimationFrame(frame)
  }, [])

  // "(3) Soporte · Panel Boxie" mientras haya consultas sin leer.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '')
    document.title = unread > 0 ? `(${unread}) ${base}` : base
    return () => {
      document.title = document.title.replace(/^\(\d+\) /, '')
    }
  }, [unread])

  const chime = useCallback(() => {
    const ctx = audio.current
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    // Dos notas cortas, suaves (Mi y La).
    ;[659.25, 880].forEach((frequency, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      const start = now + i * 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  }, [])

  const toggle = useCallback(async () => {
    const next = !enabled
    writeEnabled(next)
    if (!next) return
    try {
      audio.current ??= new AudioContext()
      await audio.current.resume()
      chime()
    } catch {
      // Sin audio: quedan las notificaciones.
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default')
      setPermission(await Notification.requestPermission())
  }, [enabled, chime])

  // Con los avisos activos, el audio se habilita con el primer toque de la página.
  useEffect(() => {
    if (!enabled) return
    const unlock = () => {
      try {
        audio.current ??= new AudioContext()
        void audio.current.resume()
      } catch {
        // nada
      }
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [enabled])

  /** Un mensaje nuevo de un cliente. */
  const alert = useCallback(
    (title: string, body: string, tag: string) => {
      if (!enabled) return
      chime()
      if (
        document.visibilityState === 'hidden' &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          const notification = new Notification(title, { body, tag, icon: '/icon.png' })
          notification.onclick = () => {
            window.focus()
            notification.close()
          }
        } catch {
          // Algunos navegadores solo notifican desde un service worker.
        }
      }
    },
    [enabled, chime],
  )

  return { enabled, permission, toggle, alert }
}
