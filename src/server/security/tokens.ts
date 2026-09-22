import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Tokens de acceso (docs/ARQUITECTURA.md §3.3).
 *
 * `/g/<token>` abre el regalo y `/editor/<token>` el editor: el token ES la
 * credencial. 24 bytes aleatorios → 32 caracteres base64url (192 bits: no se
 * adivinan ni se enumeran, a diferencia de "BOX-" + 4 dígitos).
 *
 * En la base se guarda el SHA-256 (para buscar) y, en el caso del regalo, una
 * copia cifrada con AES-256-GCM para poder volver a mostrarle el link al
 * comprador. La clave de cifrado vive en el entorno, no en la base.
 */

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/

export function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

const VERSION = 'v1'

export function encryptToken(token: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION}.${Buffer.concat([iv, tag, ciphertext]).toString('base64url')}`
}

export function decryptToken(payload: string, keyBase64: string): string {
  const [version, body] = payload.split('.')
  if (version !== VERSION || !body) throw new Error('Formato de token cifrado desconocido')
  const raw = Buffer.from(body, 'base64url')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const ciphertext = raw.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyBase64, 'base64'), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export interface IssuedTokens {
  gift: string
  giftHash: string
  giftEncrypted: string
  edit: string
  editHash: string
}

/** Tokens nuevos para una Boxie. Los crudos solo existen en memoria y en el mail. */
export function issueBoxieTokens(encryptionKey: string): IssuedTokens {
  const gift = generateToken()
  const edit = generateToken()
  return {
    gift,
    giftHash: hashToken(gift),
    giftEncrypted: encryptToken(gift, encryptionKey),
    edit,
    editHash: hashToken(edit),
  }
}
