'use server'

import { cookies, headers } from 'next/headers'
import {
  findGift,
  giftCookieName,
  giftCookieOptions,
  registerGiftOpen,
  unlockGift,
} from '@/server/gift'
import { log } from '@/server/log'
import { clientIp, rateLimit } from '@/server/rate-limit'

export type UnlockResult = { ok: true } | { ok: false; error: string }

/** Clave del regalo (opcional, la define el comprador). */
export async function unlockGiftAction(token: string, password: string): Promise<UnlockResult> {
  if (typeof token !== 'string' || typeof password !== 'string') {
    return { ok: false, error: 'Clave incorrecta.' }
  }
  const gift = await findGift(token)
  if (!gift || gift.availability !== 'available') {
    return { ok: false, error: 'Este regalo no está disponible.' }
  }
  const ip = clientIp(await headers())
  // Frena el tanteo: pocas claves por regalo y por dispositivo.
  if (!rateLimit(`gift-password:${gift.boxieId}:${ip}`, { limit: 8, windowMs: 15 * 60_000 })) {
    return { ok: false, error: 'Demasiados intentos. Esperá unos minutos.' }
  }
  const access = await unlockGift(gift, password.slice(0, 100))
  if (!access) return { ok: false, error: 'Clave incorrecta. Pedísela a quien te mandó el regalo.' }
  ;(await cookies()).set(giftCookieName(gift.boxieId), access, giftCookieOptions())
  return { ok: true }
}

/**
 * Registra que se abrió. Lo llama el navegador al mostrar el regalo (no el
 * render del servidor): así no cuentan los robots que arman la vista previa
 * del link en WhatsApp.
 */
export async function markGiftOpenedAction(token: string): Promise<void> {
  if (typeof token !== 'string') return
  try {
    const gift = await findGift(token)
    if (!gift || gift.availability !== 'available') return
    const ip = clientIp(await headers())
    if (!rateLimit(`gift-open:${gift.boxieId}:${ip}`, { limit: 1, windowMs: 30 * 60_000 })) return
    await registerGiftOpen(gift.boxieId)
  } catch (error) {
    log.error('No se pudo registrar la apertura del regalo', error)
  }
}
