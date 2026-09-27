/**
 * Canales de adquisición: de dónde llega la gente que compra una Boxie.
 *
 * Cada visita (y cada venta) se clasifica en un canal a partir de su origen
 * (utm_source / utm_medium, el sitio que la mandó o el identificador de clic
 * de la plataforma). El canal es lo que mira un equipo de performance: cuánto
 * se invirtió, cuánto trajo y cuánto costó cada venta en cada uno.
 */

export type ChannelId =
  | 'meta'
  | 'google'
  | 'tiktok'
  | 'influencers'
  | 'afiliados'
  | 'email'
  | 'whatsapp'
  | 'social'
  | 'seo'
  | 'referral'
  | 'directo'
  | 'otros'
  | 'sin-datos'

/** Pago (se compra pauta), socios (creadores, afiliados), propios (base de clientes), orgánicos. */
export type ChannelKind = 'paid' | 'partner' | 'owned' | 'organic' | 'direct' | 'unknown'

export interface ChannelInfo {
  id: ChannelId
  label: string
  kind: ChannelKind
  /** Para qué sirve / qué incluye (ayudas del panel). */
  hint: string
}

export const CHANNELS: ChannelInfo[] = [
  {
    id: 'meta',
    label: 'Meta Ads',
    kind: 'paid',
    hint: 'Anuncios pagos en Instagram y Facebook.',
  },
  {
    id: 'google',
    label: 'Google Ads',
    kind: 'paid',
    hint: 'Búsqueda, Performance Max y YouTube pagos.',
  },
  { id: 'tiktok', label: 'TikTok Ads', kind: 'paid', hint: 'Anuncios pagos en TikTok.' },
  {
    id: 'influencers',
    label: 'Influencers',
    kind: 'partner',
    hint: 'Creadoras y creadores: canjes, colaboraciones y posteos pagos.',
  },
  {
    id: 'afiliados',
    label: 'Afiliados',
    kind: 'partner',
    hint: 'Ventas con el código de un afiliado (cobra comisión por venta).',
  },
  {
    id: 'email',
    label: 'Email',
    kind: 'owned',
    hint: 'Newsletter, recuperación de carritos y mails a clientes.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    kind: 'owned',
    hint: 'Difusiones, estados y chats que comparten el link.',
  },
  {
    id: 'social',
    label: 'Redes (orgánico)',
    kind: 'organic',
    hint: 'Posteos, historias y bio de Instagram, TikTok o Facebook sin pauta.',
  },
  {
    id: 'seo',
    label: 'Búsqueda orgánica',
    kind: 'organic',
    hint: 'Google, Bing y otros buscadores sin anuncio.',
  },
  {
    id: 'referral',
    label: 'Otros sitios',
    kind: 'organic',
    hint: 'Links desde blogs, notas, directorios u otras páginas.',
  },
  {
    id: 'directo',
    label: 'Directo',
    kind: 'direct',
    hint: 'Escribieron la dirección, un favorito o un link sin origen (muchas veces, WhatsApp).',
  },
  {
    id: 'otros',
    label: 'Otros',
    kind: 'organic',
    hint: 'Orígenes etiquetados que no encajan en ningún canal.',
  },
  {
    id: 'sin-datos',
    label: 'Sin datos de origen',
    kind: 'unknown',
    hint: 'Ventas anteriores a la medición o de navegadores que no guardan el origen.',
  },
]

const BY_ID = new Map(CHANNELS.map((c) => [c.id, c]))

export function channelInfo(id: ChannelId): ChannelInfo {
  return BY_ID.get(id) ?? BY_ID.get('otros')!
}

export function channelLabel(id: ChannelId): string {
  return channelInfo(id).label
}

export function isChannelId(value: string): value is ChannelId {
  return BY_ID.has(value as ChannelId)
}

/** Canales en los que se puede cargar inversión (una campaña). */
export const SPEND_CHANNELS: ChannelId[] = [
  'meta',
  'google',
  'tiktok',
  'influencers',
  'afiliados',
  'email',
  'whatsapp',
  'social',
  'otros',
]

export const CHANNEL_KIND_LABEL: Record<ChannelKind, string> = {
  paid: 'Pauta',
  partner: 'Socios',
  owned: 'Propios',
  organic: 'Orgánico',
  direct: 'Directo',
  unknown: 'Sin datos',
}

// ── Clasificación ───────────────────────────────────────────────────────────

const PAID_MEDIUM =
  /^(cpc|ppc|cpm|cpv|cpa|paid|paid[-_ ]?social|social[-_ ]?paid|paidsocial|ads?|display|video|pmax|shopping|retargeting|remarketing)$/
const META_SOURCE = /^(meta|facebook|fb|instagram|ig|an|msg|messenger|audience[-_ ]?network)$/
const GOOGLE_SOURCE = /^(google|adwords|gads|google[-_ ]?ads|youtube|yt|gdn|pmax)$/
const TIKTOK_SOURCE = /^(tiktok|tt)$/
const SEARCH_SOURCE =
  /^(google|bing|yahoo|duckduckgo|ecosia|yandex|baidu|brave|search\.brave\.com|startpage)$/
const SOCIAL_SOURCE =
  /^(instagram|ig|facebook|fb|meta|tiktok|twitter|x|t\.co|threads|pinterest|youtube|yt|linkedin|reddit|snapchat)$/

export interface SourceMedium {
  source: string
  medium: string
}

/**
 * El canal de un origen. Las reglas siguen la convención de Google Analytics
 * (agrupación de canales por defecto), adaptada a cómo vende Boxie: las
 * campañas etiquetadas mandan; sin etiquetas, decide el sitio que mandó la
 * visita.
 */
export function classifyChannel({ source, medium }: SourceMedium): ChannelId {
  const s = source.trim().toLowerCase()
  const m = medium.trim().toLowerCase()
  if (!s && !m) return 'directo'
  if (s === '(direct)' || (s === '' && m === '(none)')) return 'directo'

  const paid = PAID_MEDIUM.test(m)
  if (paid && META_SOURCE.test(s)) return 'meta'
  if (paid && GOOGLE_SOURCE.test(s)) return 'google'
  if (paid && TIKTOK_SOURCE.test(s)) return 'tiktok'

  if (/influencer|creator|creadora?|ugc|canje/.test(m) || /influencer|creadora?/.test(s))
    return 'influencers'
  if (/affiliate|afiliad|partner/.test(m)) return 'afiliados'
  if (
    m === 'email' ||
    m === 'e-mail' ||
    m === 'newsletter' ||
    /newsletter|klaviyo|mailchimp|resend/.test(s)
  )
    return 'email'
  if (/whatsapp/.test(s) || /whatsapp/.test(m) || s === 'wa') return 'whatsapp'

  if (paid) return 'otros'
  if (SOCIAL_SOURCE.test(s) || m === 'social' || m === 'social-network' || m === 'bio')
    return 'social'
  if (m === 'organic' || (SEARCH_SOURCE.test(s) && (m === '' || m === 'referral'))) return 'seo'
  if (m === 'referral') return 'referral'
  return 'otros'
}
