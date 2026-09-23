'use server'

import { cookies } from 'next/headers'
import type { LockResult, PasswordResult, SaveResult } from '@/slides/editor/contract'
import { lockForGifting, saveDraft, SESSION_EXPIRED, setGiftPassword } from '@/server/editor'
import { EDITOR_COOKIE, readEditorSession } from '@/server/editor-session'
import { log } from '@/server/log'
import { rateLimit } from '@/server/rate-limit'

/**
 * Acciones del editor. La Boxie sale siempre de la cookie firmada: el
 * navegador nunca dice qué Boxie está editando.
 */

const GENERIC = 'No pudimos guardar. Probá de nuevo en un rato.'
const TOO_FAST = 'Demasiados cambios seguidos. Esperá unos segundos.'

async function session() {
  return readEditorSession((await cookies()).get(EDITOR_COOKIE)?.value)
}

export async function saveDraftAction(draft: unknown): Promise<SaveResult> {
  const s = await session()
  if (!s) return { ok: false, error: SESSION_EXPIRED }
  if (!rateLimit(`editor-save:${s.boxieId}`, { limit: 90, windowMs: 60_000 })) {
    return { ok: false, error: TOO_FAST }
  }
  try {
    return await saveDraft(s, draft)
  } catch (error) {
    log.error('No se pudo guardar el borrador', error, { boxieId: s.boxieId })
    return { ok: false, error: GENERIC }
  }
}

export async function setGiftPasswordAction(password: string | null): Promise<PasswordResult> {
  const s = await session()
  if (!s) return { ok: false, error: SESSION_EXPIRED }
  if (typeof password !== 'string' && password !== null) {
    return { ok: false, error: 'Clave inválida.' }
  }
  if (!rateLimit(`editor-password:${s.boxieId}`, { limit: 10, windowMs: 10 * 60_000 })) {
    return { ok: false, error: TOO_FAST }
  }
  try {
    return await setGiftPassword(s, password)
  } catch (error) {
    log.error('No se pudo guardar la clave del regalo', error, { boxieId: s.boxieId })
    return { ok: false, error: GENERIC }
  }
}

export async function lockBoxieAction(): Promise<LockResult> {
  const s = await session()
  if (!s) return { ok: false, error: SESSION_EXPIRED }
  if (!rateLimit(`editor-lock:${s.boxieId}`, { limit: 10, windowMs: 10 * 60_000 })) {
    return { ok: false, error: TOO_FAST }
  }
  try {
    return await lockForGifting(s)
  } catch (error) {
    log.error('No se pudo bloquear la Boxie', error, { boxieId: s.boxieId })
    return { ok: false, error: 'No pudimos bloquear la Boxie. Probá de nuevo en un rato.' }
  }
}
