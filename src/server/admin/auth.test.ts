import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticateAdmin, DEMO_LOCKED_MESSAGE, demoCredentials } from './auth'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('login del panel en modo demo', () => {
  it('en local se entra con la clave de muestra', () => {
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('ADMIN_DEMO_PASSWORD', '')
    expect(demoCredentials()).toMatchObject({ isDefault: true, locked: false })
  })

  it('en un deploy, sin clave propia, el panel queda cerrado', async () => {
    vi.stubEnv('DEMO_MODE', '1')
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('ADMIN_DEMO_PASSWORD', '')
    expect(demoCredentials().locked).toBe(true)
    await expect(authenticateAdmin('admin@boxie.demo', 'boxie-admin')).resolves.toEqual({
      ok: false,
      error: DEMO_LOCKED_MESSAGE,
    })
  })

  it('en un deploy con ADMIN_DEMO_PASSWORD vale esa clave y no la de muestra', async () => {
    vi.stubEnv('DEMO_MODE', '1')
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('ADMIN_DEMO_PASSWORD', 'una-clave-larga-propia')
    expect(demoCredentials()).toMatchObject({ isDefault: false, locked: false })
    await expect(authenticateAdmin('admin@boxie.demo', 'boxie-admin')).resolves.toMatchObject({
      ok: false,
      error: 'Mail o clave incorrectos.',
    })
  })
})
