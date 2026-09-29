import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ADMIN_COOKIE,
  adminPasswordFingerprint,
  getAdminSession,
  issueAdminSession,
  readAdminSession,
  REMEMBER_DAYS,
} from './session'

const SECRET = 's'.repeat(48)
const mockCookies = new Map<string, string>()
let mockUser: Record<string, unknown> | null = null

vi.mock('server-only', () => ({}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined,
  }),
}))

vi.mock('../db/client', () => ({
  serviceDb: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockUser, error: null }),
        }),
      }),
    }),
  }),
}))

vi.mock('../demo', () => ({
  isDemoMode: () => false,
}))

beforeAll(() => {
  vi.stubEnv('SESSION_SECRET', SECRET)
  vi.stubEnv('DEMO_MODE', '0')
})

beforeEach(() => {
  mockCookies.clear()
  mockUser = null
})

describe('P1.2 · Revocación activa y duración de sesiones', () => {
  it('el tiempo de "recordarme" está limitado a un máximo de 7 días', () => {
    expect(REMEMBER_DAYS).toBe(7)
  })

  it('adminPasswordFingerprint genera una huella determinista', () => {
    const fp1 = adminPasswordFingerprint('hash-clave-1')
    const fp2 = adminPasswordFingerprint('hash-clave-1')
    const fp3 = adminPasswordFingerprint('hash-clave-2')

    expect(fp1).toBe(fp2)
    expect(fp1).not.toBe(fp3)
    expect(fp1.length).toBe(16)
  })

  it('la sesión firmada incluye la huella del hash de contraseña', () => {
    const hash = 'scrypt$hash$secreto'
    const fp = adminPasswordFingerprint(hash)
    const { value } = issueAdminSession(
      { uid: 'usr-1', email: 'owner@boxie.ar', name: 'Owner', role: 'owner', fp },
      false,
      false,
    )

    const session = readAdminSession(value)
    expect(session).toMatchObject({
      uid: 'usr-1',
      email: 'owner@boxie.ar',
      role: 'owner',
      fp,
    })
  })

  it('getAdminSession valida activamente y refresca datos de la base de datos', async () => {
    const hash = 'scrypt$hash$secreto'
    const fp = adminPasswordFingerprint(hash)
    const { value } = issueAdminSession(
      { uid: 'usr-1', email: 'owner@boxie.ar', name: 'Owner', role: 'editor', fp },
      false,
      false,
    )
    mockCookies.set(ADMIN_COOKIE, value)

    // En BD el rol cambió a owner y está activo
    mockUser = {
      user_id: 'usr-1',
      email: 'owner@boxie.ar',
      name: 'Owner Actualizado',
      role: 'owner',
      is_active: true,
      password_hash: hash,
    }

    const session = await getAdminSession()
    expect(session).not.toBeNull()
    expect(session?.role).toBe('owner')
    expect(session?.name).toBe('Owner Actualizado')
  })

  it('corta de inmediato el acceso si el usuario es desactivado (is_active: false)', async () => {
    const hash = 'scrypt$hash$secreto'
    const fp = adminPasswordFingerprint(hash)
    const { value } = issueAdminSession(
      { uid: 'usr-2', email: 'baja@boxie.ar', name: 'Ex Miembro', role: 'support', fp },
      false,
      false,
    )
    mockCookies.set(ADMIN_COOKIE, value)

    mockUser = {
      user_id: 'usr-2',
      email: 'baja@boxie.ar',
      name: 'Ex Miembro',
      role: 'support',
      is_active: false,
      password_hash: hash,
    }

    const session = await getAdminSession()
    expect(session).toBeNull()
  })

  it('corta de inmediato el acceso si el usuario fue eliminado de la base de datos', async () => {
    const hash = 'scrypt$hash$secreto'
    const fp = adminPasswordFingerprint(hash)
    const { value } = issueAdminSession(
      { uid: 'usr-3', email: 'borrado@boxie.ar', name: 'Borrado', role: 'admin', fp },
      false,
      false,
    )
    mockCookies.set(ADMIN_COOKIE, value)

    mockUser = null // Eliminado de users

    const session = await getAdminSession()
    expect(session).toBeNull()
  })

  it('corta de inmediato el acceso si el usuario cambia su contraseña (huella fp diferente)', async () => {
    const oldHash = 'scrypt$hash$antiguo'
    const newHash = 'scrypt$hash$NUEVO'
    const oldFp = adminPasswordFingerprint(oldHash)

    const { value } = issueAdminSession(
      { uid: 'usr-4', email: 'seguro@boxie.ar', name: 'User', role: 'admin', fp: oldFp },
      false,
      false,
    )
    mockCookies.set(ADMIN_COOKIE, value)

    // En BD ya tiene el nuevo hash
    mockUser = {
      user_id: 'usr-4',
      email: 'seguro@boxie.ar',
      name: 'User',
      role: 'admin',
      is_active: true,
      password_hash: newHash,
    }

    const session = await getAdminSession()
    expect(session).toBeNull()
  })
})
