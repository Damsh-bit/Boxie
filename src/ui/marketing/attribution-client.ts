'use client'

import { arDayKey } from '@/domain/admin/range'
import {
  detectDevice,
  isDirect,
  mergeTouch,
  normalizeLanding,
  touchFromLanding,
  type AttributionPayload,
  type Device,
  type StoredAttribution,
  type Touch,
  type TrafficStep,
} from '@/domain/marketing/attribution'

/**
 * La medición en el navegador: guarda de dónde llegó la persona (primer y
 * último origen, en localStorage) y cuenta la visita y los pasos del embudo
 * (una vez por visita). Sin cookies y sin nada que identifique a la persona;
 * si el navegador pide no ser rastreado (Do Not Track / Global Privacy
 * Control), no hace nada.
 */

const ATTRIBUTION_KEY = 'bx-attr'
const VISIT_KEY = 'bx-visit'
/** Una visita termina tras 30 minutos sin actividad (como Google Analytics). */
const VISIT_TIMEOUT = 30 * 60_000

interface Visit {
  day: string
  source: string
  medium: string
  campaign: string
  device: Device
  landing: string
  steps: TrafficStep[]
  last: number
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): no se mide.
  }
}

export function trackingAllowed(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.doNotTrack !== '1' && nav.globalPrivacyControl !== true
}

function device(): Device {
  return detectDevice(navigator.userAgent, window.innerWidth)
}

function send(visit: Visit, step: TrafficStep) {
  const payload = JSON.stringify({
    step,
    day: visit.day,
    source: visit.source,
    medium: visit.medium,
    campaign: visit.campaign,
    device: visit.device,
    landing: visit.landing,
  })
  try {
    if (navigator.sendBeacon?.('/api/marketing/track', payload)) return
  } catch {
    // Algunos navegadores bloquean sendBeacon: se intenta con fetch.
  }
  void fetch('/api/marketing/track', { method: 'POST', body: payload, keepalive: true }).catch(
    () => undefined,
  )
}

/**
 * Registra una página vista: suma el origen (si la llegada lo tiene), abre
 * una visita nueva si hace falta y cuenta los pasos del embudo.
 * `firstLoad`: solo en la carga inicial cuenta el sitio de origen
 * (document.referrer no cambia al navegar dentro del sitio).
 */
export function recordPageView(path: string, search: string, firstLoad: boolean) {
  if (!trackingAllowed()) return
  const now = new Date()
  const touch = touchFromLanding({
    params: new URLSearchParams(search),
    // Después de la carga inicial, el "sitio de origen" es la propia tienda: sin
    // etiquetas nuevas en la URL, navegar adentro no es un origen nuevo.
    referrer: firstLoad ? document.referrer : window.location.href,
    path,
    siteHost: window.location.host,
    now,
  })
  if (touch)
    write(ATTRIBUTION_KEY, mergeTouch(read<StoredAttribution>(ATTRIBUTION_KEY), touch, now))

  let visit = read<Visit>(VISIT_KEY)
  const differentSource =
    touch !== null &&
    !isDirect(touch) &&
    (!visit ||
      visit.source !== touch.source ||
      visit.medium !== touch.medium ||
      visit.campaign !== touch.campaign)
  if (!visit || now.getTime() - visit.last > VISIT_TIMEOUT || differentSource) {
    const origin: Pick<Touch, 'source' | 'medium' | 'campaign'> = touch ?? {
      source: '(direct)',
      medium: '(none)',
      campaign: '',
    }
    visit = {
      day: arDayKey(now),
      source: origin.source,
      medium: origin.medium,
      campaign: origin.campaign,
      device: device(),
      landing: normalizeLanding(path),
      steps: [],
      last: now.getTime(),
    }
    send(visit, 'session')
  }
  visit.last = now.getTime()
  const step: TrafficStep | null =
    path.startsWith('/tematicas/') || path.startsWith('/ejemplo/')
      ? 'theme'
      : path.startsWith('/checkout')
        ? 'checkout'
        : null
  if (step && !visit.steps.includes(step)) {
    visit.steps.push(step)
    // Llegar al checkout implica haber visto una temática (se entra desde una).
    if (step === 'checkout' && !visit.steps.includes('theme')) {
      visit.steps.push('theme')
      send(visit, 'theme')
    }
    send(visit, step)
  }
  write(VISIT_KEY, visit)
}

/** El origen guardado, para mandarlo con la compra (null si no hay o no se mide). */
export function currentAttribution(): AttributionPayload | null {
  if (typeof window === 'undefined' || !trackingAllowed()) return null
  const stored = read<StoredAttribution>(ATTRIBUTION_KEY)
  if (!stored) return null
  return { first: stored.first, last: stored.last, device: device() }
}

// ── Cupón que llega en un link ──────────────────────────────────────────────

const COUPON_KEY = 'bx-cupon'
/** Un cupón de un link vale una semana (lo que tarda en decidirse quien vio el anuncio). */
const COUPON_DAYS = 7

/**
 * Guarda el cupón de un link (?cupon=MAMA15) para aplicarlo solo en el
 * checkout, aunque la persona entre por la home o por una temática. No es
 * medición: se guarda aunque el navegador pida no ser rastreado.
 */
export function rememberCoupon(search: string) {
  const code = new URLSearchParams(search).get('cupon')?.trim().toUpperCase()
  if (!code || !/^[A-Z0-9_-]{3,32}$/.test(code)) return
  write(COUPON_KEY, { code, at: Date.now() })
}

/** El cupón de un link reciente, o null. */
export function pendingCoupon(): string | null {
  if (typeof window === 'undefined') return null
  const saved = read<{ code: string; at: number }>(COUPON_KEY)
  if (!saved || Date.now() - saved.at > COUPON_DAYS * 86_400_000) return null
  return saved.code
}

export function forgetCoupon() {
  try {
    localStorage.removeItem(COUPON_KEY)
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}
