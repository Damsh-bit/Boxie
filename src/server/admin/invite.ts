/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import { ADMIN_ROLES, type AdminRole } from '@/domain/admin/types'
import { serviceDb, escapeIlike } from '../db/client'
import { siteUrl } from '../env'
import { log } from '../log'
import { sendMail } from '../mail/send'
import { adminPasswordResetEmail, teamInviteEmail } from '../mail/templates'
import { generateToken, hashToken } from '../security/tokens'
import { hashPassword } from './password'
import type { Actor } from './repo'
import { adminPasswordFingerprint } from './token'

export interface MemberInviteInput {
  name: string
  email: string
  role: AdminRole
}

export interface InviteResult {
  id: string
  email: string
  name: string
  role: AdminRole
  inviteUrl: string
  pending: boolean
  lastSeenAt: null
  createdAt: string
}

async function getOrCreateAuthUser(db: any, email: string, name: string): Promise<string | null> {
  try {
    const { data: created } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    })
    if (created?.user?.id) {
      return created.user.id
    }
    // Si ya existía en auth.users, buscamos su ID
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === email)
    return existing?.id ?? null
  } catch (err) {
    log.warn('No se pudo sincronizar usuario con auth.admin', { error: err })
    return null
  }
}

/**
 * Registra o actualiza la invitación de un miembro en public.users
 * y envía el correo con Resend.
 */
export async function createMemberInvite(
  input: MemberInviteInput,
  actor: Actor,
): Promise<InviteResult> {
  const db = serviceDb()
  const email = input.email.toLowerCase().trim()
  const token = generateToken()
  const tokenHash = hashToken(token)
  // La invitación expira en 48 horas
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const nowIso = new Date().toISOString()

  // 1. Validar que el correo no pertenezca a un cliente con compras en la tienda
  const { data: customerOrder } = await db
    .from('orders')
    .select('id')
    .ilike('buyer_email', escapeIlike(email))
    .limit(1)
    .maybeSingle()

  if (customerOrder) {
    throw new Error(
      'Este correo pertenece a un cliente con compras registradas. Por seguridad, usá un correo corporativo o diferente para el equipo.',
    )
  }

  // 2. Verificar si ya existe en public.users
  const { data: existing } = await (db.from('users') as any)
    .select('user_id, email, password_hash, role')
    .ilike('email', escapeIlike(email))
    .maybeSingle()

  let userId: string

  if (existing) {
    // Si existe pero como usuario sin rol administrativo (cliente del portal)
    if (existing.role === null || existing.role === undefined) {
      throw new Error(
        'Este correo ya está registrado como cliente del portal. Por seguridad, usá un correo corporativo o diferente para el equipo.',
      )
    }

    // Si ya tiene contraseña, ya es un miembro activo
    if (existing.password_hash) {
      throw new Error('Esa persona ya está en el equipo con una cuenta activa.')
    }

    userId = existing.user_id
    // Actualizar invitación pendiente
    const { error: updateError } = await db
      .from('users')
      .update({
        name: input.name,
        role: input.role,
        invited_at: nowIso,
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt.toISOString(),
      } as any)
      .eq('user_id', userId)

    if (updateError) {
      log.error('Error al actualizar invitación de equipo', updateError)
      throw new Error('No se pudo actualizar la invitación.')
    }
  } else {
    // Insertar nuevo miembro en estado pendiente
    let { data: inserted, error: insertError } = await db
      .from('users')
      .insert({
        email,
        name: input.name,
        role: input.role,
        invited_at: nowIso,
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt.toISOString(),
      } as any)
      .select('user_id')
      .single()

    // Si la BD aún conserva la FK hacia auth.users (ej. admin_users_user_id_fkey):
    if (
      insertError &&
      (insertError.code === '23503' ||
        String(insertError.message).includes('foreign key constraint'))
    ) {
      log.warn('Detectada FK hacia auth.users, resolviendo usuario en auth...', { email })
      const authUserId = await getOrCreateAuthUser(db, email, input.name)
      if (authUserId) {
        const retry = await db
          .from('users')
          .insert({
            user_id: authUserId,
            email,
            name: input.name,
            role: input.role,
            invited_at: nowIso,
            invite_token_hash: tokenHash,
            invite_expires_at: expiresAt.toISOString(),
          } as any)
          .select('user_id')
          .single()

        inserted = retry.data
        insertError = retry.error
      }
    }

    if (insertError || !inserted) {
      log.error('Error al insertar nuevo miembro de equipo', insertError)
      throw new Error('No se pudo registrar la invitación.')
    }
    userId = inserted.user_id
  }

  const inviteUrl = siteUrl(`/admin/activar?token=${token}`)
  const roleLabel = ADMIN_ROLES.find((r) => r.value === input.role)?.label ?? input.role

  // 2. Enviar email mediante Resend
  try {
    await sendMail({
      to: email,
      tag: 'team-invite',
      ...teamInviteEmail({
        name: input.name,
        inviterName: actor.name || 'Un administrador',
        roleLabel,
        inviteUrl,
        expiresAt,
      }),
    })
  } catch (err) {
    log.error('No se pudo enviar el correo de invitación con Resend', err)
    // No bloqueamos: el admin igual recibe el inviteUrl para copiarlo a mano si falla el mail
  }

  return {
    id: userId,
    email,
    name: input.name,
    role: input.role,
    inviteUrl,
    pending: true,
    lastSeenAt: null,
    createdAt: nowIso,
  }
}

/**
 * Consulta la validez de un token de invitación.
 */
export async function getInviteDetails(token: string) {
  if (!token || token.length < 16) {
    return { ok: false as const, error: 'Enlace de invitación inválido.' }
  }

  const tokenHash = hashToken(token)
  const db = serviceDb()

  const { data: user, error } = await (db.from('users') as any)
    .select('user_id, email, name, role, invite_expires_at, password_hash, totp_enabled')
    .eq('invite_token_hash', tokenHash)
    .maybeSingle()

  if (error || !user) {
    return { ok: false as const, error: 'La invitación no existe o ya fue utilizada.' }
  }

  const expiresAt = user.invite_expires_at ? new Date(user.invite_expires_at) : null
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return {
      ok: false as const,
      error: 'Esta invitación ha expirado. Solicitá al dueño que te envíe una nueva.',
    }
  }

  const roleLabel = ADMIN_ROLES.find((r) => r.value === user.role)?.label ?? user.role

  return {
    ok: true as const,
    user: {
      id: user.user_id as string,
      email: (user.email ?? '') as string,
      name: (user.name || (user.email ?? '').split('@')[0] || 'Miembro') as string,
      role: user.role as AdminRole,
      roleLabel,
      totpEnabled: user.totp_enabled === true,
    },
  }
}

/**
 * Activa la cuenta de un miembro asignándole su contraseña y anulando el token.
 */
export async function activateMemberAccount(token: string, password: string) {
  if (!password || password.length < 12) {
    return { ok: false as const, error: 'La contraseña debe tener al menos 12 caracteres.' }
  }

  const check = await getInviteDetails(token)
  if (!check.ok) return check

  const { user } = check
  const passwordHash = hashPassword(password)
  const nowIso = new Date().toISOString()
  const db = serviceDb()

  const { error } = await db
    .from('users')
    .update({
      password_hash: passwordHash,
      invite_token_hash: null,
      invite_expires_at: null,
      last_seen_at: nowIso,
    } as any)
    .eq('user_id', user.id)

  if (error) {
    log.error('Error al activar cuenta de miembro', error)
    return { ok: false as const, error: 'No se pudo guardar la contraseña. Probá de nuevo.' }
  }

  // La clave NO se copia a Supabase Auth: el panel entra con su propia sesión
  // (clave + TOTP). Una clave en auth.users permitía pedirle un JWT a Supabase
  // con la clave pública y saltear el 2FA (auditoría 17/11/2026).

  return {
    ok: true as const,
    // Con 2FA activo, restablecer la clave no abre sesión: hay que entrar con clave + código.
    requires2FA: user.totpEnabled,
    identity: {
      uid: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      fp: adminPasswordFingerprint(passwordHash),
    },
  }
}

/**
 * Envía un correo con token para restablecer la contraseña de un miembro del equipo de administración.
 */
/** "santiago@x.com" → "san***@x.com": para logs, sin exponer el mail entero. */
export function maskEmail(email: string): string {
  return email.replace(
    /^([^@]{1,3})[^@]*(@.*)?$/,
    (_m, head: string, domain?: string) => `${head}***${domain ?? ''}`,
  )
}

export async function sendPasswordResetEmail(
  emailInput: string,
): Promise<{ ok: boolean; error?: string }> {
  const email = emailInput.toLowerCase().trim()
  if (!email) return { ok: false, error: 'Ingresá un correo electrónico válido.' }

  const db = serviceDb()
  // Igual que el login: sin distinguir mayúsculas y solo cuentas con rol.
  const { data: user, error } = await (db.from('users') as any)
    .select('user_id, email, name, role')
    .ilike('email', escapeIlike(email))
    .not('role', 'is', null)
    .maybeSingle()

  if (error) {
    log.error('Error al buscar usuario para restablecer contraseña', error)
    return { ok: false, error: 'No se pudo buscar la cuenta.' }
  }

  // Por seguridad, a quien lo pide no se le dice si el mail es de un admin (la
  // respuesta es siempre la misma). Pero queda en el log interno, enmascarado:
  // "no me llega el mail" casi siempre es un mail que no está en el equipo.
  if (!user) {
    log.info('Restablecer clave: el mail no es de ningún admin', { email: maskEmail(email) })
    return { ok: true }
  }

  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // Válido por 2 horas

  const { error: updateError } = await (db.from('users') as any)
    .update({
      invite_token_hash: tokenHash,
      invite_expires_at: expiresAt.toISOString(),
    })
    .eq('user_id', user.user_id)

  if (updateError) {
    log.error('Error al guardar token de restablecimiento de contraseña', updateError)
    return { ok: false, error: 'No se pudo generar el enlace de recuperación.' }
  }

  const resetUrl = siteUrl(`/admin/activar?token=${token}&type=reset`)

  try {
    await sendMail({
      to: email,
      tag: 'admin-password-reset',
      ...adminPasswordResetEmail({
        name: user.name || 'Administrador',
        resetUrl,
        expiresAt,
      }),
    })
  } catch (err) {
    log.error('Error al enviar email de recuperación de contraseña', err)
    return { ok: false, error: 'No se pudo enviar el correo de recuperación.' }
  }

  log.info('Correo de recuperación de contraseña enviado', { email: maskEmail(email) })
  return { ok: true }
}
