/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import { ADMIN_ROLES, type AdminRole } from '@/domain/admin/types'
import { serviceDb } from '../db/client'
import { siteUrl } from '../env'
import { log } from '../log'
import { sendMail } from '../mail/send'
import { teamInviteEmail } from '../mail/templates'
import { generateToken, hashToken } from '../security/tokens'
import { hashPassword } from './password'
import type { Actor } from './repo'

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

  // 1. Verificar si ya existe en public.users
  const { data: existing } = await (db.from('users') as any)
    .select('user_id, email, password_hash, role')
    .ilike('email', email)
    .maybeSingle()

  let userId: string

  if (existing) {
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
    const { data: inserted, error: insertError } = await db
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
    .select('user_id, email, name, role, invite_expires_at, password_hash')
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
    },
  }
}

/**
 * Activa la cuenta de un miembro asignándole su contraseña y anulando el token.
 */
export async function activateMemberAccount(token: string, password: string) {
  if (!password || password.length < 8) {
    return { ok: false as const, error: 'La contraseña debe tener al menos 8 caracteres.' }
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

  return {
    ok: true as const,
    identity: {
      uid: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  }
}
