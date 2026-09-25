import 'server-only'
import { cache } from 'react'
import { giftAvailability, type GiftAvailability } from '@/domain/boxie'
import {
  collectAssetIds,
  parseBuyerContent,
  readThemeConfig,
  type ParsedThemeConfig,
} from '@/slides/config'
import { applyPlan, planOfOrder } from './boxie-plan'
import { serviceDb, unwrap, unwrapMaybe } from './db/client'
import { env, siteUrl } from './env'
import { toLifecycle } from './mappers'
import { signedMediaUrls } from './media'
import { verifyPassword } from './security/password'
import { expiresIn, sign, verify, type SignedPayload } from './security/signed'
import { hashToken, isWellFormedToken } from './security/tokens'

/**
 * El regalo: /g/<token>. El token es la credencial (docs/ARQUITECTURA.md
 * §3.3) y se resuelve siempre en el servidor. En el prototipo el link buscaba
 * la Boxie en el localStorage del destinatario, donde nunca estaba.
 */

/** Las fotos del regalo se firman por unas horas: alcanza para recorrerlo entero. */
const GIFT_MEDIA_TTL_SECONDS = 6 * 60 * 60

export interface Gift {
  boxieId: string
  availability: GiftAvailability
  recipientName: string
  senderName: string
  expiresAt: string
  themeName: string
  versionId: string
  /** La orden (de ahí sale el plan: qué pantallas incluye el regalo). */
  orderId: string
  passwordHash: string | null
}

/** Cacheado por request: lo piden la página, su metadata y la imagen de Open Graph. */
export const findGift = cache(async (token: string): Promise<Gift | null> => {
  if (!isWellFormedToken(token)) return null
  const row = unwrapMaybe(
    await serviceDb()
      .from('boxies')
      .select(
        'id, order_id, status, locked_at, expires_at, recipient_name, sender_name, theme_version_id, gift_password_hash, order:orders(theme:themes(name))',
      )
      .eq('gift_token_hash', hashToken(token))
      .maybeSingle(),
    'regalo por token',
  )
  if (!row) return null
  return {
    boxieId: row.id,
    availability: giftAvailability(toLifecycle(row), new Date()),
    recipientName: row.recipient_name,
    senderName: row.sender_name,
    expiresAt: row.expires_at,
    themeName: row.order?.theme?.name ?? 'Boxie',
    versionId: row.theme_version_id,
    orderId: row.order_id,
    passwordHash: row.gift_password_hash,
  }
})

export interface GiftContent {
  config: ParsedThemeConfig
  data: {
    recipientName: string
    senderName: string
    content: Record<string, Record<string, unknown>>
    media: Record<string, string>
  }
}

export async function giftContent(gift: Gift): Promise<GiftContent> {
  const [version, rows, plan] = await Promise.all([
    serviceDb()
      .from('theme_versions')
      .select('config')
      .eq('id', gift.versionId)
      .single()
      .then((r) => unwrap(r, 'versión de la temática')),
    serviceDb()
      .from('boxie_content')
      .select('slide_key, props')
      .eq('boxie_id', gift.boxieId)
      .then((r) => unwrap(r, 'contenido del regalo')),
    planOfOrder(gift.orderId),
  ])
  const config = applyPlan(readThemeConfig(version.config), plan)
  const parsed = parseBuyerContent(config, {
    recipientName: gift.recipientName,
    senderName: gift.senderName,
    slides: Object.fromEntries(rows.map((r) => [r.slide_key, r.props])),
  })
  const content = parsed.success
    ? parsed.data
    : { recipientName: gift.recipientName, senderName: gift.senderName, slides: {} }
  const media = await signedMediaUrls(
    gift.boxieId,
    GIFT_MEDIA_TTL_SECONDS,
    collectAssetIds(content),
  )
  return {
    config,
    data: {
      recipientName: content.recipientName,
      senderName: content.senderName,
      content: content.slides,
      media,
    },
  }
}

export async function registerGiftOpen(boxieId: string): Promise<void> {
  unwrapMaybe(
    await serviceDb().rpc('register_gift_open', { p_boxie_id: boxieId }),
    'apertura del regalo',
  )
}

// ── Clave opcional ──────────────────────────────────────────────────────────
// Quien sabe la clave recibe una cookie firmada para esa Boxie; si el
// comprador cambia la clave, la cookie deja de valer.

const ACCESS_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

interface GiftAccess extends SignedPayload {
  purpose: 'gift'
  boxieId: string
  fp: string
}

const passwordFingerprint = (hash: string) => hash.slice(-16)

export function giftCookieName(boxieId: string): string {
  return `bx_gift_${boxieId.replace(/-/g, '').slice(0, 12)}`
}

export function giftCookieOptions() {
  return {
    httpOnly: true,
    secure: siteUrl().startsWith('https://'),
    sameSite: 'lax' as const,
    path: '/g',
    maxAge: ACCESS_MAX_AGE_SECONDS,
  }
}

export function hasGiftAccess(gift: Gift, cookieValue: string | undefined): boolean {
  if (!gift.passwordHash) return true
  const access = verify<GiftAccess>(cookieValue, 'gift', env().SESSION_SECRET)
  return access?.boxieId === gift.boxieId && access.fp === passwordFingerprint(gift.passwordHash)
}

/** Verifica la clave; si es correcta, devuelve el valor de la cookie de acceso. */
export async function unlockGift(gift: Gift, password: string): Promise<string | null> {
  if (!gift.passwordHash) return null
  if (!(await verifyPassword(password, gift.passwordHash))) return null
  return sign<GiftAccess>(
    {
      purpose: 'gift',
      boxieId: gift.boxieId,
      fp: passwordFingerprint(gift.passwordHash),
      exp: expiresIn(ACCESS_MAX_AGE_SECONDS),
    },
    env().SESSION_SECRET,
  )
}
