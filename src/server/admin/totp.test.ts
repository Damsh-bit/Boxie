import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { OTP } from 'otplib'
import { consumeBackupCode, startTotpSetup, verifyTotpToken } from './totp'

process.env.SESSION_SECRET = 'super-secret-key-that-is-at-least-32-chars-long!'

vi.mock('../env', () => ({
  env: () => ({
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    SESSION_SECRET: 'super-secret-key-that-is-at-least-32-chars-long!',
  }),
}))

const updateMock = vi.fn().mockReturnThis()
const eqMock = vi.fn().mockResolvedValue({ error: null })
vi.mock('../db/client', () => ({
  serviceDb: () => ({
    from: () => ({
      update: updateMock,
      eq: eqMock,
    }),
  }),
}))

describe('2FA / TOTP Server Module', () => {
  it('genera un secreto TOTP cifrado y un código QR válido', async () => {
    const setup = await startTotpSetup('user-123', 'admin@boxie.digital')

    expect(setup.secret).toHaveLength(32)
    expect(setup.setupToken).toBeDefined()
    expect(setup.qrCodeUrl).toContain('data:image/png;base64,')
  })

  it('verifica tokens TOTP válidos e inválidos', async () => {
    const otp = new OTP()
    const secret = otp.generateSecret()
    const { encryptToken } = await import('../security/tokens')
    const { env } = await import('../env')
    const secretEnc = encryptToken(secret, env().TOKEN_ENCRYPTION_KEY)

    const token = await otp.generate({ secret })
    const valid = await verifyTotpToken(secretEnc, token)
    expect(valid).toBe(true)

    const invalid = await verifyTotpToken(secretEnc, '000000')
    expect(invalid).toBe(false)
  })

  it('valida y consume códigos de respaldo de un solo uso', async () => {
    const rawCode = 'A1B2-C3D4'
    const hashed = createHash('sha256').update(rawCode).digest('hex')

    const valid = await consumeBackupCode('user-123', [hashed], rawCode)
    expect(valid).toBe(true)

    const invalid = await consumeBackupCode('user-123', [hashed], 'WRONG-CODE')
    expect(invalid).toBe(false)
  })
})
