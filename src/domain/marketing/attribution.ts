import { z } from 'zod'

/**
 * Atribución: de dónde vino cada visita y cada compra.
 *
 * El navegador guarda dos "toques" (el primero y el último que no fue
 * directo) con el origen de la visita: los parámetros UTM de un anuncio, el
 * identificador de clic de la plataforma o el sitio que mandó a la persona.
 * Al comprar, el checkout los manda con la orden. Con eso el panel sabe qué
 * canal y qué campaña trajo cada venta, con el modelo de último clic (el que
 * cerró la venta), de primer clic (el que la descubrió) o repartido.
 *
 * No se guarda nada que identifique a la persona: solo el origen, la página
 * de entrada y el tipo de dispositivo.
 */

export type Device = 'mobile' | 'tablet' | 'desktop'

export interface Touch {
  /** utm_source o el sitio que mandó la visita ("instagram", "google", "(direct)"). */
  source: string
  /** utm_medium ("paid_social", "cpc", "organic", "referral", "email", "(none)"). */
  medium: string
  /** utm_campaign (vacío si no hay). */
  campaign: string
  /** utm_content: el anuncio o la pieza. */
  content: string
  /** utm_term: la palabra clave. */
  term: string
  /** Página de entrada normalizada ("/", "/tematicas/pareja"). */
  landing: string
  /** Cuándo llegó (ISO). */
  at: string
}

export interface StoredAttribution {
  first: Touch
  last: Touch
}

export interface OrderAttribution {
  orderId: string
  first: Touch | null
  last: Touch | null
  device: Device | null
  createdAt: string
}

/** Un primer toque vence a los 90 días: después, la persona "vuelve a llegar". */
export const FIRST_TOUCH_DAYS = 90
/** Un toque directo no pisa al último con origen si este tiene menos de 30 días. */
export const LAST_TOUCH_DAYS = 30

const DAY = 86_400_000
const MAX = 100

function clean(value: string | null | undefined, max = MAX): string {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>"'`]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, max)
}

/** Página de entrada: la ruta sin parámetros, en minúsculas y corta. */
export function normalizeLanding(path: string): string {
  const bare = (path.split(/[?#]/)[0] ?? '/').toLowerCase()
  const parts = bare
    .split('/')
    .filter(Boolean)
    .map((p) => p.replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 2)
  const out = `/${parts.join('/')}`
  return out.slice(0, 80)
}

const SEARCH_HOSTS: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'yahoo'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)ecosia\.org$/, 'ecosia'],
  [/(^|\.)yandex\.[a-z.]+$/, 'yandex'],
  [/(^|\.)search\.brave\.com$/, 'brave'],
]
const SOCIAL_HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$|^l\.facebook\.com$/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, 'twitter'],
  [/(^|\.)threads\.net$/, 'threads'],
  [/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/, 'pinterest'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, 'linkedin'],
  [/(^|\.)reddit\.com$/, 'reddit'],
]
const MAIL_HOSTS = /(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com)$/
const WHATSAPP_HOSTS = /(^|\.)(whatsapp\.com|wa\.me)$/

/** Origen de una visita sin etiquetas, según el sitio que la mandó. */
export function sourceFromReferrer(host: string): { source: string; medium: string } {
  const h = host.toLowerCase().replace(/^www\./, '')
  for (const [re, name] of SEARCH_HOSTS) if (re.test(h)) return { source: name, medium: 'organic' }
  for (const [re, name] of SOCIAL_HOSTS) if (re.test(h)) return { source: name, medium: 'social' }
  if (MAIL_HOSTS.test(h)) return { source: h, medium: 'email' }
  if (WHATSAPP_HOSTS.test(h)) return { source: 'whatsapp', medium: 'social' }
  return { source: h.slice(0, MAX), medium: 'referral' }
}

export interface LandingInput {
  /** Los parámetros de la URL de entrada (?utm_source=…). */
  params: URLSearchParams
  /** document.referrer ('' si no hay). */
  referrer: string
  /** Ruta de la página de entrada. */
  path: string
  /** Dominio propio: una visita que viene del mismo sitio no es un origen. */
  siteHost: string
  now: Date
}

/**
 * El toque de una llegada al sitio, o null si es navegación interna (vino del
 * mismo sitio y sin etiquetas). Las etiquetas UTM mandan; sin ellas, los
 * identificadores de clic que solo ponen los anuncios (gclid, ttclid,
 * msclkid); si no, el sitio de origen; si no hay nada, es directo.
 *
 * `fbclid` no alcanza para decir que fue un anuncio: Meta lo agrega a todos
 * los links que salen de Instagram y Facebook, pagos o no. Por eso las
 * campañas de Meta tienen que llevar UTM (Marketing › Herramientas).
 */
export function touchFromLanding(input: LandingInput): Touch | null {
  const p = input.params
  const get = (k: string) => clean(p.get(k))
  const landing = normalizeLanding(input.path)
  const at = input.now.toISOString()
  const base = { campaign: get('utm_campaign'), content: get('utm_content'), term: get('utm_term') }

  let referrerHost = ''
  try {
    referrerHost = input.referrer ? new URL(input.referrer).hostname.toLowerCase() : ''
  } catch {
    referrerHost = ''
  }
  const own = input.siteHost.toLowerCase().replace(/^www\./, '')
  const internal = referrerHost !== '' && referrerHost.replace(/^www\./, '') === own

  const utmSource = get('utm_source')
  if (utmSource) {
    const medium =
      get('utm_medium') || (referrerHost ? sourceFromReferrer(referrerHost).medium : '')
    return { source: utmSource, medium, ...base, landing, at }
  }
  const ref = get('ref')
  if (ref) return { source: ref, medium: 'affiliate', ...base, landing, at }
  if (p.get('gclid') || p.get('gbraid') || p.get('wbraid'))
    return { source: 'google', medium: 'cpc', ...base, landing, at }
  if (p.get('ttclid')) return { source: 'tiktok', medium: 'paid_social', ...base, landing, at }
  if (p.get('msclkid')) return { source: 'bing', medium: 'cpc', ...base, landing, at }
  if (p.get('fbclid')) {
    const from = referrerHost && !internal ? sourceFromReferrer(referrerHost) : null
    return {
      source: from?.medium === 'social' ? from.source : 'facebook',
      medium: 'social',
      ...base,
      landing,
      at,
    }
  }
  if (internal) return null
  if (referrerHost) return { ...sourceFromReferrer(referrerHost), ...base, landing, at }
  return { source: '(direct)', medium: '(none)', ...base, landing, at }
}

export const isDirect = (t: Touch) => t.source === '(direct)'

/**
 * Suma un toque nuevo a lo guardado:
 * - el primero se queda (salvo que tenga más de 90 días);
 * - el último pasa a ser el nuevo, salvo que el nuevo sea directo y el último
 *   con origen sea reciente ("último clic no directo", como Google Analytics).
 */
export function mergeTouch(
  stored: StoredAttribution | null,
  touch: Touch,
  now: Date,
): StoredAttribution {
  const age = (t: Touch) => now.getTime() - Date.parse(t.at)
  if (!stored || !(age(stored.first) < FIRST_TOUCH_DAYS * DAY)) return { first: touch, last: touch }
  if (isDirect(touch) && !isDirect(stored.last) && age(stored.last) < LAST_TOUCH_DAYS * DAY)
    return stored
  return { first: stored.first, last: touch }
}

/** El tipo de dispositivo, por el navegador y el ancho de la pantalla. */
export function detectDevice(userAgent: string, width: number): Device {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua) || width < 640)
    return 'mobile'
  return 'desktop'
}

// ── Validación (lo que manda el navegador) ─────────────────────────────────

const text = (max = MAX) =>
  z
    .string()
    .max(max * 2)
    .transform((v) => clean(v, max))

export const TouchSchema = z.object({
  source: text().pipe(z.string().min(1)),
  medium: text(),
  campaign: text(),
  content: text(),
  term: text(),
  landing: z
    .string()
    .max(200)
    .transform((v) => normalizeLanding(v)),
  at: z.iso.datetime(),
})

export const DeviceSchema = z.enum(['mobile', 'tablet', 'desktop'])

export const AttributionPayloadSchema = z.object({
  first: TouchSchema.nullable(),
  last: TouchSchema.nullable(),
  device: DeviceSchema.nullable(),
})
export type AttributionPayload = z.infer<typeof AttributionPayloadSchema>

/**
 * Lo que manda el checkout, o null si no sirve (sin datos, con fechas del
 * futuro o de hace más de un año: un navegador con el reloj mal o un pedido
 * armado a mano).
 */
export function parseAttributionPayload(
  input: unknown,
  now = new Date(),
): AttributionPayload | null {
  const parsed = AttributionPayloadSchema.safeParse(input)
  if (!parsed.success) return null
  const ok = (t: Touch | null) => {
    if (!t) return null
    const at = Date.parse(t.at)
    return at <= now.getTime() + 5 * 60_000 && now.getTime() - at < 400 * DAY ? t : null
  }
  const first = ok(parsed.data.first)
  const last = ok(parsed.data.last)
  if (!first && !last) return null
  return { first: first ?? last, last: last ?? first, device: parsed.data.device }
}

export const TRAFFIC_STEPS = ['session', 'theme', 'checkout'] as const
export type TrafficStep = (typeof TRAFFIC_STEPS)[number]

/** Lo que manda el navegador para contar una visita (o un paso del embudo). */
export const TrafficPayloadSchema = z.object({
  step: z.enum(TRAFFIC_STEPS),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: text().pipe(z.string().min(1)),
  medium: text(),
  campaign: text(),
  device: DeviceSchema,
  landing: z
    .string()
    .max(200)
    .transform((v) => normalizeLanding(v)),
})
export type TrafficPayload = z.infer<typeof TrafficPayloadSchema>
