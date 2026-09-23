import 'server-only'
import { randomUUID } from 'node:crypto'
import { editorAvailability, type EditorAvailability } from '@/domain/boxie'
import {
  collectAssetIds,
  missingForLock,
  parseBuyerContent,
  readThemeConfig,
  type BuyerContent,
  type ParsedThemeConfig,
} from '@/slides/config'
import {
  GIFT_PASSWORD_MAX,
  GIFT_PASSWORD_MIN,
  type LockResult,
  type PasswordResult,
  type SaveResult,
  type UploadResult,
} from '@/slides/editor/contract'
import { getPublicSettings } from './catalog'
import { serviceDb, unwrap, unwrapMaybe } from './db/client'
import type { Json } from './db/database.types'
import { editorFingerprint, type EditorSession } from './editor-session'
import { env, siteUrl } from './env'
import { log } from './log'
import { sendMail } from './mail/send'
import { giftReadyEmail } from './mail/templates'
import { toLifecycle } from './mappers'
import {
  BOXIE_MEDIA_BUCKET,
  boxiePhotoPath,
  MAX_PHOTO_BYTES,
  pruneUnusedMedia,
  signedMediaUrls,
  sniffImage,
} from './media'
import { hashPassword } from './security/password'
import { decryptToken, hashToken, isWellFormedToken } from './security/tokens'

/**
 * El editor del comprador, del lado del servidor. Cada operación parte de la
 * sesión firmada (nunca de un ID que mande el navegador), revalida que la
 * Boxie se pueda editar y valida el contenido contra el registro de slides.
 */

/** Las fotos se ven en el editor con URLs firmadas que duran un rato. */
const EDITOR_MEDIA_TTL_SECONDS = 2 * 60 * 60
const MAX_PHOTOS_PER_BOXIE = 30

export const SESSION_EXPIRED =
  'Tu sesión del editor venció. Volvé a entrar con el link que te mandamos por mail.'

const NOT_EDITABLE: Record<Exclude<EditorAvailability, 'editable'>, string> = {
  locked: 'Esta Boxie ya se bloqueó para regalar: no se puede editar más.',
  expired: 'El plazo para editar esta Boxie venció.',
  refunded: 'Esta Boxie fue reembolsada.',
}

const BOXIE_COLUMNS =
  'id, code, status, locked_at, expires_at, recipient_name, sender_name, theme_version_id, gift_token_enc, gift_password_hash, edit_token_hash, order_id'

type BoxieRow = {
  id: string
  code: string
  status: 'active' | 'refunded' | 'expired'
  locked_at: string | null
  expires_at: string
  recipient_name: string
  sender_name: string
  theme_version_id: string
  gift_token_enc: string
  gift_password_hash: string | null
  edit_token_hash: string
  order_id: string
}

// ── Entrada al editor ───────────────────────────────────────────────────────

/** El link del mail: token → Boxie. Null si no existe (o está mal formado). */
export async function findBoxieByEditToken(
  token: string,
): Promise<{ boxieId: string; editTokenHash: string } | null> {
  if (!isWellFormedToken(token)) return null
  const row = unwrapMaybe(
    await serviceDb()
      .from('boxies')
      .select('id, edit_token_hash')
      .eq('edit_token_hash', hashToken(token))
      .maybeSingle(),
    'Boxie por token de edición',
  )
  return row ? { boxieId: row.id, editTokenHash: row.edit_token_hash } : null
}

/** La Boxie de la sesión, si la sesión sigue valiendo (el token no se rotó). */
async function sessionBoxie(session: EditorSession): Promise<BoxieRow | null> {
  const row = unwrapMaybe(
    await serviceDb().from('boxies').select(BOXIE_COLUMNS).eq('id', session.boxieId).maybeSingle(),
    'Boxie de la sesión',
  )
  if (!row || editorFingerprint(row.edit_token_hash) !== session.fp) return null
  return row
}

async function versionConfig(versionId: string): Promise<ParsedThemeConfig> {
  const row = unwrap(
    await serviceDb().from('theme_versions').select('config').eq('id', versionId).single(),
    'versión de la temática',
  )
  return readThemeConfig(row.config)
}

async function storedContent(boxie: BoxieRow): Promise<BuyerContent> {
  const rows = unwrap(
    await serviceDb().from('boxie_content').select('slide_key, props').eq('boxie_id', boxie.id),
    'contenido de la Boxie',
  )
  return {
    recipientName: boxie.recipient_name,
    senderName: boxie.sender_name,
    slides: Object.fromEntries(
      rows.map((r) => [r.slide_key, (r.props ?? {}) as Record<string, unknown>]),
    ),
  }
}

function giftUrlOf(boxie: Pick<BoxieRow, 'gift_token_enc'>): string {
  return siteUrl(`/g/${decryptToken(boxie.gift_token_enc, env().TOKEN_ENCRYPTION_KEY)}`)
}

export interface EditorData {
  code: string
  availability: EditorAvailability
  /** Antes de bloquear: fin de la ventana de edición. Después: vencimiento del regalo. */
  expiresAt: string
  theme: { name: string; slug: string }
  config: ParsedThemeConfig
  content: BuyerContent
  media: Record<string, string>
  hasPassword: boolean
  lifetimeDays: number
  /** Solo si ya está bloqueada. */
  giftUrl: string | null
  buyerEmail: string
}

export async function loadEditor(session: EditorSession): Promise<EditorData | null> {
  const boxie = await sessionBoxie(session)
  if (!boxie) return null

  const [order, config, content, media, settings] = await Promise.all([
    serviceDb()
      .from('orders')
      .select('buyer_email, theme:themes(name, slug)')
      .eq('id', boxie.order_id)
      .single()
      .then((r) => unwrap(r, 'orden de la Boxie')),
    versionConfig(boxie.theme_version_id),
    storedContent(boxie),
    signedMediaUrls(boxie.id, EDITOR_MEDIA_TTL_SECONDS),
    getPublicSettings(),
  ])
  const availability = editorAvailability(toLifecycle(boxie), new Date())

  return {
    code: boxie.code,
    availability,
    expiresAt: boxie.expires_at,
    theme: { name: order.theme?.name ?? 'Boxie', slug: order.theme?.slug ?? '' },
    config,
    content,
    media,
    hasPassword: boxie.gift_password_hash !== null,
    lifetimeDays: settings.giftLifetimeDays,
    giftUrl: availability === 'locked' ? giftUrlOf(boxie) : null,
    buyerEmail: order.buyer_email,
  }
}

type Guard = { ok: true; boxie: BoxieRow } | { ok: false; error: string }

/** Sesión válida y Boxie todavía editable. */
async function editableBoxie(session: EditorSession): Promise<Guard> {
  const boxie = await sessionBoxie(session)
  if (!boxie) return { ok: false, error: SESSION_EXPIRED }
  const availability = editorAvailability(toLifecycle(boxie), new Date())
  if (availability !== 'editable') return { ok: false, error: NOT_EDITABLE[availability] }
  return { ok: true, boxie }
}

// ── Guardar ─────────────────────────────────────────────────────────────────

export async function saveDraft(session: EditorSession, input: unknown): Promise<SaveResult> {
  const guard = await editableBoxie(session)
  if (!guard.ok) return guard
  const { boxie } = guard

  const config = await versionConfig(boxie.theme_version_id)
  const parsed = parseBuyerContent(config, input)
  if (!parsed.success) {
    log.warn('Borrador inválido', { boxieId: boxie.id, issues: parsed.issues.slice(0, 5) })
    return { ok: false, error: `Hay datos que no pudimos guardar: ${parsed.issues[0]}` }
  }

  // Solo fotos de esta Boxie: una referencia a la foto de otra no se guarda.
  const assetIds = collectAssetIds(parsed.data)
  if (assetIds.length > 0) {
    const owned = unwrap(
      await serviceDb()
        .from('media_assets')
        .select('id')
        .eq('owner_type', 'boxie')
        .eq('owner_id', boxie.id)
        .in('id', assetIds),
      'fotos del borrador',
    )
    if (owned.length !== assetIds.length) {
      return { ok: false, error: 'Alguna de las fotos no está disponible. Volvé a subirla.' }
    }
  }

  const savedAt = unwrap(
    await serviceDb().rpc('save_boxie_content', {
      p_boxie_id: boxie.id,
      p_recipient_name: parsed.data.recipientName,
      p_sender_name: parsed.data.senderName,
      p_slides: parsed.data.slides as Json,
    }),
    'guardar borrador',
  )
  return { ok: true, savedAt }
}

// ── Fotos ───────────────────────────────────────────────────────────────────

export async function uploadPhoto(
  session: EditorSession,
  file: Blob,
  size: { width: number; height: number },
): Promise<UploadResult> {
  const guard = await editableBoxie(session)
  if (!guard.ok) return guard
  const { boxie } = guard

  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'La foto pesa demasiado. Probá con otra.' }
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = sniffImage(bytes)
  if (!mime) return { ok: false, error: 'Ese archivo no es una foto JPG, PNG o WebP.' }

  const { count } = await serviceDb()
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .eq('owner_type', 'boxie')
    .eq('owner_id', boxie.id)
  if ((count ?? 0) >= MAX_PHOTOS_PER_BOXIE) {
    return { ok: false, error: 'Llegaste al máximo de fotos de esta Boxie.' }
  }

  const assetId = randomUUID()
  const path = boxiePhotoPath(boxie.id, assetId, mime)
  const storage = serviceDb().storage.from(BOXIE_MEDIA_BUCKET)
  const uploaded = await storage.upload(path, bytes, {
    contentType: mime,
    upsert: false,
    cacheControl: '31536000',
  })
  if (uploaded.error) throw new Error(`Storage: ${uploaded.error.message}`)

  const dimension = (n: number) => (Number.isInteger(n) && n > 0 && n <= 20_000 ? n : null)
  const inserted = await serviceDb()
    .from('media_assets')
    .insert({
      id: assetId,
      owner_type: 'boxie',
      owner_id: boxie.id,
      bucket: BOXIE_MEDIA_BUCKET,
      path,
      mime,
      bytes: bytes.length,
      width: dimension(size.width),
      height: dimension(size.height),
    })
    .select('id')
    .single()
  if (inserted.error) {
    await storage.remove([path])
    throw new Error(`No se pudo registrar la foto: ${inserted.error.message}`)
  }

  const signed = await storage.createSignedUrl(path, EDITOR_MEDIA_TTL_SECONDS)
  if (signed.error) throw new Error(`No se pudo firmar la foto: ${signed.error.message}`)
  return { ok: true, photo: { assetId }, url: signed.data.signedUrl }
}

// ── Clave del regalo ────────────────────────────────────────────────────────

export async function setGiftPassword(
  session: EditorSession,
  password: string | null,
): Promise<PasswordResult> {
  const guard = await editableBoxie(session)
  if (!guard.ok) return guard

  let hash: string | null = null
  if (password !== null) {
    const clean = password.trim()
    if (clean.length < GIFT_PASSWORD_MIN || clean.length > GIFT_PASSWORD_MAX) {
      return {
        ok: false,
        error: `La clave tiene que tener entre ${GIFT_PASSWORD_MIN} y ${GIFT_PASSWORD_MAX} caracteres.`,
      }
    }
    hash = await hashPassword(clean)
  }
  unwrap(
    await serviceDb()
      .from('boxies')
      .update({ gift_password_hash: hash })
      .eq('id', guard.boxie.id)
      .select('id')
      .single(),
    'clave del regalo',
  )
  return { ok: true, hasPassword: hash !== null }
}

// ── Bloquear y regalar ──────────────────────────────────────────────────────

export async function lockForGifting(session: EditorSession): Promise<LockResult> {
  const guard = await editableBoxie(session)
  if (!guard.ok) return guard
  const { boxie } = guard

  const config = await versionConfig(boxie.theme_version_id)
  const parsed = parseBuyerContent(config, await storedContent(boxie))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Hay datos guardados que no son válidos. Revisalos y probá de nuevo.',
    }
  }
  const missing = missingForLock(config, parsed.data)
  if (missing.length > 0) {
    return { ok: false, error: 'Todavía falta completar algunas cosas.', missing }
  }
  const photos = collectAssetIds(parsed.data)
  const available = await signedMediaUrls(boxie.id, 60, photos)
  if (Object.keys(available).length !== photos.length) {
    return { ok: false, error: 'Alguna de las fotos no está disponible. Volvé a subirla.' }
  }

  const locked = unwrap(
    await serviceDb().rpc('lock_boxie', { p_boxie_id: boxie.id }),
    'bloquear Boxie',
  )
  const giftUrl = giftUrlOf(boxie)

  // Lo que sigue no puede deshacer el bloqueo: si falla, se registra y listo.
  await pruneUnusedMedia(boxie.id, photos).catch((error) =>
    log.error('No se pudieron limpiar las fotos sin usar', error, { boxieId: boxie.id }),
  )
  const emailedTo = await sendGiftReady(boxie, giftUrl, locked.expires_at).catch((error) => {
    log.error('No se pudo mandar el mail del regalo', error, { boxieId: boxie.id })
    return null
  })

  return { ok: true, giftUrl, expiresAt: locked.expires_at, emailedTo }
}

async function sendGiftReady(boxie: BoxieRow, giftUrl: string, expiresAt: string) {
  const order = unwrap(
    await serviceDb()
      .from('orders')
      .select('buyer_name, buyer_email')
      .eq('id', boxie.order_id)
      .single(),
    'orden de la Boxie',
  )
  const fresh = unwrap(
    await serviceDb()
      .from('boxies')
      .select('recipient_name, gift_password_hash')
      .eq('id', boxie.id)
      .single(),
    'Boxie bloqueada',
  )
  const mail = giftReadyEmail({
    buyerName: order.buyer_name,
    recipientName: fresh.recipient_name,
    giftUrl,
    expiresAt: new Date(expiresAt),
    hasPassword: fresh.gift_password_hash !== null,
  })
  await sendMail({ ...mail, to: order.buyer_email, tag: 'gift-ready' })
  await serviceDb()
    .from('boxies')
    .update({ gift_email_sent_at: new Date().toISOString() })
    .eq('id', boxie.id)
  return order.buyer_email
}
