import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'
import { expiresIn, sign, verify } from './signed'
import {
  decryptToken,
  encryptToken,
  generateToken,
  hashToken,
  isWellFormedToken,
  issueBoxieTokens,
} from './tokens'

const KEY = randomBytes(32).toString('base64')
const SECRET = 'x'.repeat(40)

describe('tokens', () => {
  it('son de 32 caracteres base64url y no se repiten', () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateToken))
    expect(tokens.size).toBe(1000)
    for (const t of tokens) expect(isWellFormedToken(t)).toBe(true)
  })

  it('el hash es determinístico y no revela el token', () => {
    const t = generateToken()
    expect(hashToken(t)).toBe(hashToken(t))
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(t)).not.toContain(t)
  })

  it('la copia cifrada se recupera con la clave correcta y con ninguna otra', () => {
    const issued = issueBoxieTokens(KEY)
    expect(decryptToken(issued.giftEncrypted, KEY)).toBe(issued.gift)
    expect(issued.giftHash).toBe(hashToken(issued.gift))
    expect(() => decryptToken(issued.giftEncrypted, randomBytes(32).toString('base64'))).toThrow()
  })

  it('el cifrado es no determinístico (IV aleatorio)', () => {
    const t = generateToken()
    expect(encryptToken(t, KEY)).not.toBe(encryptToken(t, KEY))
  })

  it('rechaza un cifrado manipulado', () => {
    const payload = encryptToken(generateToken(), KEY)
    const tampered = payload.slice(0, -2) + (payload.endsWith('A') ? 'BB' : 'AA')
    expect(() => decryptToken(tampered, KEY)).toThrow()
  })
})

describe('valores firmados', () => {
  it('verifica lo que firmó', () => {
    const value = sign({ purpose: 'editor', exp: expiresIn(60), boxieId: 'b1' }, SECRET)
    expect(verify(value, 'editor', SECRET)).toMatchObject({ boxieId: 'b1' })
  })

  it('rechaza firmas ajenas, propósitos cruzados y vencidos', () => {
    const value = sign({ purpose: 'editor', exp: expiresIn(60), boxieId: 'b1' }, SECRET)
    expect(verify(value, 'editor', 'y'.repeat(40))).toBeNull()
    expect(verify(value, 'checkout', SECRET)).toBeNull()
    expect(verify(value, 'editor', SECRET, Date.now() + 61_000)).toBeNull()
  })

  it('rechaza un payload modificado', () => {
    const value = sign({ purpose: 'editor', exp: expiresIn(60), boxieId: 'b1' }, SECRET)
    const [, sig] = value.split('.')
    const forged = `${Buffer.from(JSON.stringify({ purpose: 'editor', exp: expiresIn(60), boxieId: 'b2' })).toString('base64url')}.${sig}`
    expect(verify(forged, 'editor', SECRET)).toBeNull()
    expect(verify('basura', 'editor', SECRET)).toBeNull()
    expect(verify(undefined, 'editor', SECRET)).toBeNull()
  })
})

describe('clave opcional del regalo', () => {
  it('verifica sin importar mayúsculas ni espacios', async () => {
    const stored = await hashPassword('Cumple2026')
    expect(stored).not.toContain('Cumple2026')
    expect(await verifyPassword(' cumple2026 ', stored)).toBe(true)
    expect(await verifyPassword('cumple2025', stored)).toBe(false)
    expect(await verifyPassword('x', 'no-es-un-hash')).toBe(false)
  })
})
