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

export async function disableTotpAction(code: string): Promise<{ ok: boolean; error?: string }> {
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

export async function changePasswordAction(
  _prev: { ok: boolean; error?: string; success?: boolean },
  formData: FormData,
): Promise<{ ok: boolean; error?: string; success?: boolean }> {
  const session = await requireAdminAction()
  if (isDemoMode()) {
    return { ok: false, error: 'El cambio de contraseña no está disponible en modo demo.' }
  }

  const currentPassword = String(formData.get('currentPassword') ?? '').trim()
  const newPassword = String(formData.get('newPassword') ?? '').trim()
  const confirmPassword = String(formData.get('confirmPassword') ?? '').trim()

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, error: 'Completá todos los campos.' }
  }

  if (newPassword.length < 12) {
    return { ok: false, error: 'La nueva contraseña debe tener al menos 12 caracteres.' }
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: 'Las contraseñas nuevas no coinciden.' }
  }

  if (newPassword === currentPassword) {
    return { ok: false, error: 'La nueva contraseña debe ser diferente a la actual.' }
  }

  const lower = newPassword.toLowerCase()
  if (
    lower.includes('boxie-admin') ||
    lower === 'password' ||
    lower === '123456789012' ||
    lower === 'adminadminadmin'
  ) {
    return { ok: false, error: 'La contraseña elegida es demasiado predecible o insegura.' }
  }

  const { hashPassword, verifyPassword } = await import('@/server/admin/password')
  const { log } = await import('@/server/log')

  const db = serviceDb()
  const { data: user, error } = await db
    .from('users')
    .select('user_id, password_hash')
    .eq('user_id', session.uid)
    .maybeSingle()

  if (error || !user) {
    return { ok: false, error: 'Usuario no disponible o no encontrado.' }
  }

  const row = user as { user_id: string; password_hash?: string | null }
  if (!row.password_hash) {
    return { ok: false, error: 'La cuenta no tiene una contraseña configurada.' }
  }

  const { ok: isCurrentValid } = verifyPassword(currentPassword, row.password_hash)
  if (!isCurrentValid) {
    return { ok: false, error: 'La contraseña actual ingresada es incorrecta.' }
  }

  const newHash = hashPassword(newPassword)
  const { error: updateError } = await db
    .from('users')
    .update({ password_hash: newHash })
    .eq('user_id', session.uid)

  if (updateError) {
    log.error('Error al actualizar contraseña de administrador', updateError)
    return { ok: false, error: 'No se pudo guardar la nueva contraseña. Probá de nuevo.' }
  }

  // P1.2: Actualizar la cookie actual con la nueva huella para que esta sesión continúe
  // activa mientras todas las sesiones en otros navegadores o dispositivos son revocadas al instante.
  const { cookies } = await import('next/headers')
  const { ADMIN_COOKIE, adminCookieOptions, adminPasswordFingerprint, issueAdminSession } =
    await import('@/server/admin/session')
  const { value, maxAge } = issueAdminSession(
    {
      uid: session.uid,
      email: session.email,
      name: session.name,
      role: session.role,
      fp: adminPasswordFingerprint(newHash),
    },
    false,
    false,
  )
  const store = await cookies()
  store.set(ADMIN_COOKIE, value, adminCookieOptions(maxAge))

  log.info('Contraseña de administrador actualizada', { userId: session.uid })
  return { ok: true, success: true }
}
