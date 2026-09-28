'use client'

import { trackingAllowed } from './attribution-client'

/**
 * El píxel de Meta en el navegador. Está apagado salvo que se configure
 * NEXT_PUBLIC_META_PIXEL_ID (y respeta "no rastrear"). La compra no se manda
 * desde acá: la manda el servidor al acreditarse el pago (API de
 * conversiones), que es lo único seguro.
 */

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  push: unknown
  loaded: boolean
  version: string
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.replace(/\D/g, '') || null

export function metaEnabled(): boolean {
  return Boolean(META_PIXEL_ID) && trackingAllowed()
}

/**
 * La cola de fbq (la misma que arma el código oficial de Meta): los eventos se
 * anotan enseguida y se mandan cuando termina de cargar fbevents.js.
 */
function ensureFbq(): Fbq {
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq }
  if (w.fbq) return w.fbq
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  } as Fbq
  fbq.queue = []
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  w.fbq = fbq
  w._fbq ??= fbq
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  fbq('init', META_PIXEL_ID)
  return fbq
}

/** Manda un evento estándar ("PageView", "ViewContent", "InitiateCheckout"…). */
export function metaTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (!metaEnabled()) return
  const fbq = ensureFbq()
  if (eventId) fbq('track', event, params ?? {}, { eventID: eventId })
  else fbq('track', event, params ?? {})
}
