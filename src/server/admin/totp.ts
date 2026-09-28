import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { OTP } from 'otplib'
import QRCode from 'qrcode'
import { serviceDb, unwrap } from '../db/client'
import { env } from '../env'
import { log } from '../log'
import { expiresIn, sign, verify, type SignedPayload } from '../security/signed'
import { decryptToken, encryptToken } from '../security/tokens'
import { adminSecret } from './token'

/**
 * Autenticación de Dos Factores (2FA / TOTP) para administradores.
 *
 * Utiliza el estándar RFC 6238 (compatible con Google Authenticator,
 * 1Password, Authy, etc.). El secreto se almacena cifrado en la base
 * con AES-256-GCM.
 */

const otp = new OTP()

interface TotpSetupPayload extends SignedPayload {
  purpose: 'totp_setup'
  userId: string
  secretEnc: string
}

export interface TotpSetupData {
  setupToken: string
  secret: string
  qrCodeUrl: string
}

export interface SetupConfirmResult {
  ok: boolean
  error?: string
  backupCodes?: string[]
}

/** Genera 8 códigos de respaldo con formato XXXX-XXXX */
function generateBackupCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = []
  const hashed: string[] = []

  for (let i = 0; i < 8; i++) {
    const raw = randomBytes(4).toString('hex').toUpperCase()
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`
    plain.push(formatted)
    hashed.push(createHash('sha256').update(formatted).digest('hex'))
  }

  return { plain, hashed }
}

/** Inicia el proceso de activación de 2FA: genera el secreto y el código QR */
export async function startTotpSetup(userId: string, email: string): Promise<TotpSetupData> {
  const secret = otp.generateSecret()
  const secretEnc = encryptToken(secret, env().TOKEN_ENCRYPTION_KEY)

  const otpauthUrl = otp.generateURI({
    issuer: 'Boxie',
    label: email,
    secret,
  })
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 2,
    width: 280,
    color: {
      dark: '#1e1927',
      light: '#ffffff',
    },
  })

  // Token firmado de configuración temporal (5 minutos de validez)
  const setupToken = sign<TotpSetupPayload>(
    {
      purpose: 'totp_setup',
      userId,
      secretEnc,
      exp: expiresIn(300),
    },
    adminSecret(),
  )

  return { setupToken, secret, qrCodeUrl }
}

/** Confirma la activación del 2FA verificando el primer código de 6 dígitos */
export async function confirmTotpSetup(
  userId: string,
  setupToken: string,
  code: string,
): Promise<SetupConfirmResult> {
  const payload = verify<TotpSetupPayload>(setupToken, 'totp_setup', adminSecret())
  if (!payload || payload.userId !== userId) {
    return { ok: false, error: 'La sesión de configuración expiró. Probá de nuevo.' }
  }

  const cleanCode = code.replace(/\D/g, '').trim()
  if (cleanCode.length !== 6) {
    return { ok: false, error: 'El código debe tener 6 dígitos.' }
  }

  let secret: string
  try {
    secret = decryptToken(payload.secretEnc, env().TOKEN_ENCRYPTION_KEY)
  } catch {
    return { ok: false, error: 'Error al procesar la clave de cifrado.' }
  }

  const check = await otp.verify({ token: cleanCode, secret, epochTolerance: 30 })
  if (!check.valid) {
    return { ok: false, error: 'Código inválido. Verificá la hora en tu dispositivo y reintentá.' }
  }

  const { plain: backupCodes, hashed } = generateBackupCodes()

  const db = serviceDb()
  const { error } = await db
    .from('users')
    .update({
      totp_secret_enc: payload.secretEnc,
      totp_enabled: true,
      totp_backup_codes: hashed,
    })
    .eq('user_id', userId)

  if (error) {
    log.error('No se pudo guardar la configuración 2FA en users', error)
    return { ok: false, error: 'No se pudo guardar la configuración. Probá de nuevo.' }
  }

  log.info('2FA activado con éxito para usuario', { userId })
  return { ok: true, backupCodes }
}

/** Valida un código TOTP ingresado en el login */
export async function verifyTotpToken(secretEnc: string, token: string): Promise<boolean> {
  const clean = token.replace(/\D/g, '').trim()
  if (clean.length !== 6) return false

  try {
    const secret = decryptToken(secretEnc, env().TOKEN_ENCRYPTION_KEY)
    const check = await otp.verify({ token: clean, secret, epochTolerance: 30 })
    return check.valid === true
  } catch (err) {
    log.error('Error al descifrar o verificar secreto TOTP', err)
    return false
  }
}

/** Valida y consume un código de respaldo de un solo uso */
export async function consumeBackupCode(
  userId: string,
  currentHashedCodes: string[] | null | undefined,
  inputCode: string,
): Promise<boolean> {
  if (!currentHashedCodes || currentHashedCodes.length === 0) return false

  const clean = inputCode.trim().toUpperCase()
  const givenHash = createHash('sha256').update(clean).digest('hex')

  const index = currentHashedCodes.indexOf(givenHash)
  if (index === -1) return false

  // Eliminar el código consumido
  const updated = currentHashedCodes.filter((_, i) => i !== index)

  const db = serviceDb()
  const { error } = await db
    .from('users')
    .update({ totp_backup_codes: updated } as any)
    .eq('user_id', userId)

  if (error) {
    log.error('No se pudo actualizar la lista de backup codes', error)
    return false
  }

  log.info('Código de respaldo 2FA utilizado', { userId, remaining: updated.length })
  return true
}

/** Desactiva el 2FA de un usuario */
export async function disableTotp(userId: string): Promise<boolean> {
  const db = serviceDb()
  const { error } = await db
    .from('users')
    .update({
      totp_secret_enc: null,
      totp_enabled: false,
      totp_backup_codes: null,
    } as any)
    .eq('user_id', userId)

  if (error) {
    log.error('Error al desactivar 2FA', error)
    return false
  }

  log.info('2FA desactivado para usuario', { userId })
  return true
}
