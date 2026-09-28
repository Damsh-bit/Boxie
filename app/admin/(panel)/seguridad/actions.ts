'use server'

import { revalidatePath } from 'next/cache'
import { serviceDb } from '@/server/db/client'
import { isDemoMode } from '@/server/demo'
import { requireAdminAction } from '@/server/admin/session'
import {
  confirmTotpSetup,
  disableTotp,
  startTotpSetup,
  verifyTotpToken,
  type SetupConfirmResult,
  type TotpSetupData,
} from '@/server/admin/totp'

export interface TotpStatus {
  enabled: boolean
  remainingBackupCodes: number
}

export async function getTotpStatusAction(): Promise<TotpStatus> {
  const session = await requireAdminAction()
  if (isDemoMode()) {
    return { enabled: false, remainingBackupCodes: 0 }
  }

  const db = serviceDb()
  const { data: user } = await db
    .from('users')
    .select('totp_enabled, totp_backup_codes')
    .eq('user_id', session.uid)
    .maybeSingle()

  const row = user as { totp_enabled?: boolean; totp_backup_codes?: string[] } | null
  return {
    enabled: row?.totp_enabled === true,
    remainingBackupCodes: row?.totp_backup_codes?.length ?? 0,
  }
}

export async function startTotpSetupAction(): Promise<
  { ok: true; data: TotpSetupData } | { ok: false; error: string }
> {
  const session = await requireAdminAction()
  if (isDemoMode()) {
    return { ok: false, error: '2FA no disponible en modo demo.' }
  }

  try {
    const data = await startTotpSetup(session.uid, session.email)
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'No se pudo iniciar la configuración de 2FA.' }
  }
}

export async function confirmTotpSetupAction(
  setupToken: string,
  code: string,
): Promise<SetupConfirmResult> {
  const session = await requireAdminAction()
  if (isDemoMode()) {
    return { ok: false, error: '2FA no disponible en modo demo.' }
  }

  const result = await confirmTotpSetup(session.uid, setupToken, code)
  if (result.ok) {
    revalidatePath('/admin/seguridad')
  }
  return result
}

export async function disableTotpAction(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminAction()
  if (isDemoMode()) {
    return { ok: false, error: '2FA no disponible en modo demo.' }
  }

  const db = serviceDb()
  const { data: user } = await db
    .from('users')
    .select('totp_secret_enc, totp_enabled')
    .eq('user_id', session.uid)
    .maybeSingle()

  const row = user as { totp_secret_enc?: string | null; totp_enabled?: boolean } | null
  if (!row?.totp_enabled || !row.totp_secret_enc) {
    return { ok: false, error: 'El 2FA no está activo.' }
  }

  // Validar con el código actual de la app antes de desactivar
  const isValid = await verifyTotpToken(row.totp_secret_enc, code)
  if (!isValid) {
    return { ok: false, error: 'Código incorrecto. Ingresá el código de 6 dígitos de tu app.' }
  }

  const ok = await disableTotp(session.uid)
  if (ok) {
    revalidatePath('/admin/seguridad')
    return { ok: true }
  }
  return { ok: false, error: 'No se pudo desactivar el 2FA.' }
}
