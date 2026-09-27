import 'server-only'
import { addDays, arDayKey, arStartOfMonth } from '@/domain/admin/range'
import type { AdminOrder } from '@/domain/admin/types'
import type { Device, OrderAttribution, Touch } from '@/domain/marketing/attribution'
import { eventsOfYear } from '@/domain/marketing/calendar'
import type { ChannelId } from '@/domain/marketing/channels'
import type {
  Campaign,
  CampaignObjective,
  CampaignStatus,
  SpendEntry,
  TrafficRow,
} from '@/domain/marketing/types'
import { Rng, type DemoDb, type DemoMarketing } from '../admin/demo/seed'

/**
 * Un año de marketing simulado sobre las ventas de la demo: campañas de
 * Meta, Google y TikTok (siempre prendidas y de temporada), creadoras,
 * afiliados, newsletter y difusiones de WhatsApp; el origen de cada orden,
 * las visitas del sitio y lo que "reportaría" cada administrador de anuncios.
 *
 * Todo sale de las órdenes que ya tiene la demo (no cambia ninguna): primero
 * se decide de dónde vino cada una según qué campañas estaban prendidas ese
 * día, después se calculan las visitas que hacen falta para esas compras y
 * la inversión que da el ROAS de cada campaña. Es determinístico y relativo a
 * la fecha de la demo (las temporadas caen en sus fechas reales).
 */

const DAY = 86_400_000

interface Source {
  key: string
  campaign: Campaign | null
  channel: ChannelId
  source: string
  medium: string
  contents: string[]
  terms: string[]
  /** Peso para "ganarse" una compra ese día (0 = no trae). */
  pull(day: string): number
  /** Visitas que terminan en un pago iniciado. */
  startRate: number
  landing: 'theme' | 'home' | 'mixed'
  /** Parte de las visitas desde el celular. */
  mobile: number
  /** Solo campañas pagas: ROAS objetivo, CTR y "fatiga" de los últimos días. */
  roas: number
  ctr: number
  fatigue?: number
  prospect: boolean
}

const cid = (n: number) => `a7a1e7f4-1c2d-4e5f-8a9b-${String(n).padStart(12, '0')}`

export function seedMarketing(db: DemoDb, now = new Date()): DemoMarketing {
  const rng = new Rng(20260927)
  const today = arDayKey(now)
  const dataStart = arDayKey(addDays(now, -364))
  const dayOffset = (days: number) => arDayKey(addDays(now, days))
  const themeId = (slug: string | null) =>
    slug ? (db.themes.find((t) => t.slug === slug)?.id ?? null) : null
  const couponId = (code: string) => db.coupons.find((c) => c.code === code)?.id ?? null
  const couponCreated = (code: string) =>
    db.coupons.find((c) => c.code === code)?.createdAt.slice(0, 10) ?? dataStart

  /** La ocurrencia de un evento dentro del año de datos (y la próxima, si se pide). */
  const occurrence = (id: string, which: 'past' | 'next') => {
    const year = Number(today.slice(0, 4))
    const all = [year - 1, year, year + 1]
      .flatMap((y) => eventsOfYear(y))
      .filter((e) => e.id === id)
    return which === 'past'
      ? all.filter((e) => e.date >= dataStart && e.date <= today).at(-1)
      : all.find((e) => e.date > today)
  }

  const created = (day: string) => `${day < dataStart ? dataStart : day}T13:00:00.000Z`
  const campaigns: Campaign[] = []
  const sources: Source[] = []

  const campaign = (
    n: number,
    c: {
      name: string
      channel: ChannelId
      objective: CampaignObjective
      utm: string
      startsOn: string
      endsOn?: string | null
      status?: CampaignStatus
      theme?: string | null
      coupon?: string | null
      audience?: string
      notes?: string
    },
    s: Omit<Source, 'key' | 'campaign' | 'channel' | 'pull'> & {
      pull: number | ((day: string) => number)
      pausedFrom?: string
    },
  ) => {
    const row: Campaign = {
      id: cid(n),
      name: c.name,
      channel: c.channel,
      objective: c.objective,
      status: c.status ?? 'active',
      utmCampaign: c.utm,
      startsOn: c.startsOn,
      endsOn: c.endsOn ?? null,
      dailyBudgetCents: 0,
      themeId: themeId(c.theme ?? null),
      couponId: c.coupon ? couponId(c.coupon) : null,
      audience: c.audience ?? '',
      notes: c.notes ?? '',
      createdAt: created(c.startsOn),
      updatedAt: created(c.startsOn),
    }
    campaigns.push(row)
    const pull = s.pull
    sources.push({
      ...s,
      key: row.id,
      campaign: row,
      channel: c.channel,
      pull: (day) => {
        if (row.status === 'draft' || day < row.startsOn || (row.endsOn && day > row.endsOn))
          return 0
        if (s.pausedFrom && day >= s.pausedFrom) return 0
        return typeof pull === 'number' ? pull : pull(day)
      },
    })
    return row
  }

  const META = { source: 'ig', medium: 'paid_social', mobile: 0.84, prospect: true }
  const since = (from: string, weight: number) => (day: string) => (day >= from ? weight : 0)

  // ── Meta ──────────────────────────────────────────────────────────────────
  campaign(
    1,
    {
      name: 'Meta · Prospección siempre prendida',
      channel: 'meta',
      objective: 'ventas',
      utm: 'meta-prospeccion',
      startsOn: arDayKey(addDays(now, -400)),
      audience: 'Advantage+ · 20 a 45 años · Argentina · intereses: regalos, parejas, cumpleaños',
      notes: 'Tres conjuntos: video de reacción, carrusel de temáticas y UGC de unboxing.',
    },
    {
      ...META,
      contents: ['video-reaccion', 'carrusel-tematicas', 'ugc-unboxing'],
      terms: [],
      pull: 17,
      startRate: 0.036,
      landing: 'mixed',
      roas: 2,
      ctr: 0.012,
      fatigue: 0.66,
    },
  )
  campaign(
    2,
    {
      name: 'Meta · Remarketing 14 días',
      channel: 'meta',
      objective: 'remarketing',
      utm: 'meta-remarketing',
      startsOn: arDayKey(addDays(now, -345)),
      audience: 'Visitaron una temática o el checkout en los últimos 14 días y no compraron',
      notes: 'Anuncio dinámico con la temática que miraron + recordatorio del cupón BOXIE10.',
    },
    {
      ...META,
      prospect: false,
      contents: ['dinamico-tematica', 'recordatorio-cupon'],
      terms: [],
      pull: 10,
      startRate: 0.075,
      landing: 'theme',
      roas: 6,
      ctr: 0.019,
    },
  )

  const seasonal: [number, string, string, string | null, string | null, number, number][] = [
    // n, evento, utm base, temática, cupón, peso, ROAS
    [3, 'madre', 'dia-de-la-madre', 'dia-de-la-madre', null, 36, 3.3],
    [4, 'navidad', 'navidad', null, null, 30, 2.9],
    [5, 'san-valentin', 'san-valentin', 'pareja', 'PROMO35', 40, 3.7],
    [6, 'amigo', 'dia-del-amigo', 'amistad', 'AMIGO20', 34, 3.2],
  ]
  for (const [n, id, utm, theme, coupon, pull, roas] of seasonal) {
    const e = occurrence(id, 'past')
    if (!e) continue
    const year = e.date.slice(0, 4)
    campaign(
      n,
      {
        name: `Meta · ${e.name} ${year}`,
        channel: 'meta',
        objective: 'ventas',
        utm: `meta-${utm}-${year}`,
        startsOn: arDayKey(addDays(new Date(`${e.date}T12:00:00-03:00`), -e.leadDays)),
        endsOn: e.date,
        theme,
        coupon,
        audience: 'Público amplio + similares de compradores',
        notes: e.idea,
      },
      {
        ...META,
        contents: ['video-reaccion', 'historia-cuenta-regresiva', 'carrusel-tematicas'],
        terms: [],
        pull,
        startRate: 0.034,
        landing: 'theme',
        roas,
        ctr: 0.015,
      },
    )
  }
  const madre = occurrence('madre', 'next')
  if (madre) {
    const year = madre.date.slice(0, 4)
    campaign(
      7,
      {
        name: `Meta · ${madre.name} ${year}`,
        channel: 'meta',
        objective: 'ventas',
        utm: `meta-dia-de-la-madre-${year}`,
        // Programada: arranca con la ventana de demanda (nunca antes de pasado mañana).
        startsOn: [
          arDayKey(addDays(new Date(`${madre.date}T12:00:00-03:00`), -madre.leadDays)),
          dayOffset(2),
        ].sort()[1]!,
        endsOn: madre.date,
        theme: 'dia-de-la-madre',
        coupon: 'MAMA15',
        audience: 'Hijos e hijas de 22 a 45 · similares de compradores del año pasado',
        notes: 'Repetir lo que funcionó el año pasado: video de reacción de mamá + cupón MAMA15.',
      },
      {
        ...META,
        contents: [],
        terms: [],
        pull: 0,
        startRate: 0.034,
        landing: 'theme',
        roas: 0,
        ctr: 0.015,
      },
    )
  }
  campaign(
    16,
    {
      name: 'Meta · Prueba video testimonial',
      channel: 'meta',
      objective: 'ventas',
      utm: 'meta-prueba-testimonial',
      startsOn: dayOffset(-38),
      status: 'paused',
      notes: 'Pausada: el CTR nunca pasó del 0,6 %.',
    },
    {
      ...META,
      contents: ['testimonial-largo'],
      terms: [],
      pull: 4,
      pausedFrom: dayOffset(-17),
      startRate: 0.02,
      landing: 'home',
      roas: 0.9,
      ctr: 0.006,
    },
  )

  // ── Google ────────────────────────────────────────────────────────────────
  campaign(
    8,
    {
      name: 'Google · Búsqueda "regalo digital"',
      channel: 'google',
      objective: 'ventas',
      utm: 'google-busqueda-regalo',
      startsOn: dayOffset(-238),
      audience:
        'Palabras clave: regalo digital, regalo original, regalo a distancia, regalo último momento',
    },
    {
      source: 'google',
      medium: 'cpc',
      contents: ['anuncio-a', 'anuncio-b'],
      terms: ['regalo digital', 'regalo original', 'regalo a distancia', 'regalo ultimo momento'],
      pull: 8,
      startRate: 0.05,
      landing: 'home',
      mobile: 0.62,
      prospect: true,
      roas: 3.6,
      ctr: 0.068,
    },
  )
  campaign(
    9,
    {
      name: 'Google · Marca "Boxie"',
      channel: 'google',
      objective: 'marca',
      utm: 'google-marca',
      startsOn: dayOffset(-208),
      audience: 'Búsquedas con "boxie" y variantes',
      notes: 'Protege la marca de competidores que pujan por "boxie".',
    },
    {
      source: 'google',
      medium: 'cpc',
      contents: ['marca'],
      terms: ['boxie', 'boxie digital', 'boxie regalo'],
      pull: 5,
      startRate: 0.1,
      landing: 'home',
      mobile: 0.66,
      prospect: false,
      roas: 11,
      ctr: 0.21,
    },
  )

  // ── TikTok ────────────────────────────────────────────────────────────────
  campaign(
    10,
    {
      name: 'TikTok · Prueba UGC',
      channel: 'tiktok',
      objective: 'ventas',
      utm: 'tiktok-ugc-prueba',
      startsOn: dayOffset(-145),
      endsOn: dayOffset(-103),
      notes: 'Prueba de 6 semanas con 4 creadores de UGC. No llegó al equilibrio.',
    },
    {
      source: 'tiktok',
      medium: 'paid_social',
      contents: ['ugc-1', 'ugc-2', 'ugc-3'],
      terms: [],
      pull: 7,
      startRate: 0.011,
      landing: 'theme',
      mobile: 0.97,
      prospect: true,
      roas: 0.85,
      ctr: 0.009,
    },
  )
  campaign(
    11,
    {
      name: 'TikTok · Reacciones reales',
      channel: 'tiktok',
      objective: 'ventas',
      utm: 'tiktok-reacciones',
      startsOn: dayOffset(-17),
      notes: 'Segunda prueba: videos de reacciones de clientes (con permiso).',
    },
    {
      source: 'tiktok',
      medium: 'paid_social',
      contents: ['reaccion-mama', 'reaccion-novia'],
      terms: [],
      pull: 6,
      startRate: 0.014,
      landing: 'theme',
      mobile: 0.97,
      prospect: true,
      roas: 1.15,
      ctr: 0.011,
    },
  )

  // ── Socios ────────────────────────────────────────────────────────────────
  campaign(
    12,
    {
      name: 'Influencers · Canjes con creadoras',
      channel: 'influencers',
      objective: 'alcance',
      utm: 'influencers-canjes',
      startsOn: dayOffset(-330),
      coupon: 'INFLUENCER50',
      audience: 'Creadoras de 10 a 80 mil seguidores (parejas, lifestyle, manualidades)',
      notes: 'La inversión es el valor de las Boxies regaladas + el fee de las que cobran.',
    },
    {
      source: 'instagram',
      medium: 'influencer',
      contents: ['@creadora-1', '@creadora-2', '@creadora-3', '@creadora-4'],
      terms: [],
      pull: 5,
      startRate: 0.022,
      landing: 'theme',
      mobile: 0.93,
      prospect: true,
      roas: 2.2,
      ctr: 0.009,
    },
  )
  campaign(
    13,
    {
      name: 'Afiliados · Sofi Deco',
      channel: 'afiliados',
      objective: 'ventas',
      utm: 'afiliada-sofi',
      startsOn: couponCreated('SOFI10'),
      coupon: 'SOFI10',
      notes: 'Comisión del 15 % por venta con su código (se paga en Afiliados).',
    },
    {
      source: 'sofideco',
      medium: 'affiliate',
      contents: [],
      terms: [],
      pull: 0,
      startRate: 0.03,
      landing: 'home',
      mobile: 0.9,
      prospect: false,
      roas: 0,
      ctr: 0,
    },
  )

  // ── Propios ───────────────────────────────────────────────────────────────
  const afterDay = (target: number, span: number) => (day: string) => {
    const d = Number(day.slice(8, 10))
    return d >= target && d < target + span ? 9 : 0
  }
  campaign(
    14,
    {
      name: 'Email · Newsletter mensual',
      channel: 'email',
      objective: 'ventas',
      utm: 'newsletter-mensual',
      startsOn: dayOffset(-360),
      audience: 'Clientes y suscriptores (se envía el 5 de cada mes)',
    },
    {
      source: 'newsletter',
      medium: 'email',
      contents: ['boton-principal', 'banner-tematica'],
      terms: [],
      pull: afterDay(5, 3),
      startRate: 0.06,
      landing: 'theme',
      mobile: 0.7,
      prospect: false,
      roas: 0,
      ctr: 0,
    },
  )
  campaign(
    17,
    {
      name: 'Email · Aniversarios',
      channel: 'email',
      objective: 'remarketing',
      utm: 'email-aniversarios',
      startsOn: dayOffset(-300),
      coupon: 'PAREJA20',
      audience: 'Clientes que regalaron una Boxie de pareja hace 11 meses',
      notes: 'Automático: "se viene su aniversario" con PAREJA20.',
    },
    {
      source: 'newsletter',
      medium: 'email',
      contents: ['recordatorio'],
      terms: [],
      pull: 1.5,
      startRate: 0.09,
      landing: 'theme',
      mobile: 0.72,
      prospect: false,
      roas: 0,
      ctr: 0,
    },
  )
  campaign(
    15,
    {
      name: 'WhatsApp · Difusión a clientes',
      channel: 'whatsapp',
      objective: 'ventas',
      utm: 'whatsapp-difusion',
      startsOn: dayOffset(-210),
      audience: 'Lista de difusión de clientes (el 1 y el 16 de cada mes)',
    },
    {
      source: 'whatsapp',
      medium: 'social',
      contents: ['difusion'],
      terms: [],
      pull: (day) => afterDay(1, 2)(day) + afterDay(16, 2)(day) * 0.8,
      startRate: 0.07,
      landing: 'theme',
      mobile: 0.95,
      prospect: false,
      roas: 0,
      ctr: 0,
    },
  )

  // ── Orgánico ──────────────────────────────────────────────────────────────
  const organic = (
    key: string,
    channel: ChannelId,
    source: string,
    medium: string,
    pull: (day: string) => number,
    startRate: number,
    landing: Source['landing'],
    prospect: boolean,
    mobile = 0.8,
  ) =>
    sources.push({
      key,
      campaign: null,
      channel,
      source,
      medium,
      contents: [],
      terms: [],
      pull,
      startRate,
      landing,
      mobile,
      prospect,
      roas: 0,
      ctr: 0,
    })
  const growing = (from: number, to: number) => (day: string) => {
    const t = Math.min(Math.max((Date.parse(day) - Date.parse(dataStart)) / (364 * DAY), 0), 1)
    return from + (to - from) * t
  }
  organic('directo', 'directo', '(direct)', '(none)', () => 15, 0.06, 'home', false, 0.76)
  organic('ig-bio', 'social', 'instagram', 'bio', () => 9, 0.035, 'home', true, 0.92)
  organic('ig-social', 'social', 'instagram', 'social', () => 5, 0.025, 'theme', true, 0.95)
  organic(
    'tiktok',
    'social',
    'tiktok',
    'social',
    since(dayOffset(-150), 2.5),
    0.012,
    'theme',
    true,
    0.97,
  )
  organic('seo', 'seo', 'google', 'organic', growing(3, 10), 0.03, 'mixed', true, 0.6)
  organic(
    'referral',
    'referral',
    'guia-de-regalos.ejemplo.com',
    'referral',
    () => 1.6,
    0.022,
    'theme',
    true,
    0.7,
  )

  // ── El origen de cada orden ───────────────────────────────────────────────
  const byCoupon = new Map(
    sources.filter((s) => s.campaign?.couponId).map((s) => [s.campaign!.couponId!, s]),
  )
  const slugOf = new Map(db.themes.map((t) => [t.id, t.slug]))
  const touchOf = (s: Source, at: number, order: AdminOrder): Touch => {
    const themeLanding = `/tematicas/${slugOf.get(order.themeId) ?? 'pareja'}`
    const landing =
      s.landing === 'theme'
        ? themeLanding
        : s.landing === 'home'
          ? '/'
          : rng.chance(0.6)
            ? themeLanding
            : '/'
    return {
      source: s.source === 'ig' ? (rng.chance(0.72) ? 'ig' : 'fb') : s.source,
      medium: s.medium,
      campaign: s.campaign?.utmCampaign ?? '',
      content: s.contents.length ? rng.pick(s.contents) : '',
      term: s.terms.length ? rng.pick(s.terms) : '',
      landing,
      at: new Date(at).toISOString(),
    }
  }
  const pick = (day: string, filter: (s: Source) => boolean) => {
    const pool = sources.flatMap((s) => {
      const w = filter(s) ? s.pull(day) : 0
      return w > 0 ? [[s, w] as const] : []
    })
    return pool.length ? rng.weighted(pool) : sources.find((s) => s.key === 'directo')!
  }

  const attributions: OrderAttribution[] = []
  /** Última fuente de cada orden (para las visitas y la inversión). */
  const lastSource = new Map<string, Source>()
  const orders = [...db.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const order of orders) {
    const createdAt = Date.parse(order.createdAt)
    const day = arDayKey(createdAt)
    const coupon = order.couponId ? byCoupon.get(order.couponId) : undefined
    const last = coupon ?? pick(day, () => true)
    lastSource.set(order.id, last)
    // Parte de las compras llega sin datos (otro navegador, cookies borradas, apps que abren links adentro).
    if (rng.chance(0.07)) continue
    const lastAt = createdAt - rng.int(1, 90) * 60_000
    let first: Touch
    const needsEarlier = last.campaign?.objective === 'remarketing' || last.key === 'directo'
    if (!needsEarlier && rng.chance(0.64)) first = touchOf(last, lastAt, order)
    else {
      const earlier = createdAt - rng.int(1, 21) * DAY - rng.int(0, 600) * 60_000
      const s = pick(arDayKey(earlier), (x) => x.prospect && x.key !== last.key)
      first = touchOf(s, earlier, order)
    }
    const device: Device =
      rng.float() < last.mobile ? (rng.chance(0.04) ? 'tablet' : 'mobile') : 'desktop'
    attributions.push({
      orderId: order.id,
      first,
      last: touchOf(last, lastAt, order),
      device,
      createdAt: order.createdAt,
    })
  }

  // ── Visitas (agregadas por día y origen) ──────────────────────────────────
  interface DayStats {
    starts: number
    sales: number
    revenue: number
    themes: Map<string, number>
  }
  const stats = new Map<string, DayStats>()
  const statKey = (key: string, day: string) => `${key}|${day}`
  for (const order of orders) {
    const s = lastSource.get(order.id)!
    const day = arDayKey(order.createdAt)
    const k = statKey(s.key, day)
    const row = stats.get(k) ?? { starts: 0, sales: 0, revenue: 0, themes: new Map() }
    row.starts++
    const slug = slugOf.get(order.themeId) ?? 'pareja'
    row.themes.set(slug, (row.themes.get(slug) ?? 0) + 1)
    stats.set(k, row)
    if (order.status === 'paid' && order.paidAt) {
      const paidKey = statKey(s.key, arDayKey(order.paidAt))
      const p = stats.get(paidKey) ?? { starts: 0, sales: 0, revenue: 0, themes: new Map() }
      p.sales++
      p.revenue += order.amountCents
      stats.set(paidKey, p)
    }
  }

  const traffic: TrafficRow[] = []
  const sessionsOf = new Map<string, number>()
  for (let t = Date.parse(`${dataStart}T12:00:00-03:00`); arDayKey(t) <= today; t += DAY) {
    const day = arDayKey(t)
    const fraction =
      day === today
        ? Math.min(Math.max((now.getTime() - Date.parse(`${day}T00:00:00-03:00`)) / DAY, 0.05), 1)
        : 1
    for (const s of sources) {
      const st = stats.get(statKey(s.key, day))
      const active = s.pull(day) > 0
      if (!active && !st?.starts) continue
      const starts = st?.starts ?? 0
      // Días sin compras igual tienen visitas (menos cuanto menos tira el origen).
      const idle = active ? (0.3 + rng.float() * 0.6) * Math.min(1, s.pull(day) / 6) : 0
      const sessions = Math.max(
        Math.round(
          ((starts + idle) / s.startRate) * (0.88 + rng.float() * 0.24) * (starts ? 1 : fraction),
        ),
        starts,
      )
      if (sessions <= 0) continue
      sessionsOf.set(statKey(s.key, day), sessions)
      const topTheme =
        [...(st?.themes.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        db.themes.find((x) => x.id === s.campaign?.themeId)?.slug ??
        'pareja'
      const mobileSessions = Math.round(sessions * s.mobile)
      const parts: [Device, number, number][] = [
        ['mobile', mobileSessions, Math.round(starts * s.mobile)],
        ['desktop', sessions - mobileSessions, starts - Math.round(starts * s.mobile)],
      ]
      for (const [device, n, st2] of parts) {
        if (n <= 0) continue
        const landing =
          s.landing === 'home'
            ? '/'
            : s.landing === 'theme' || device === 'mobile'
              ? `/tematicas/${topTheme}`
              : '/'
        const checkouts = Math.max(st2, Math.round(n * s.startRate * (1.7 + rng.float() * 0.5)))
        const themeViews = Math.max(
          checkouts,
          Math.round(n * (landing === '/' ? 0.42 + rng.float() * 0.14 : 0.86 + rng.float() * 0.1)),
        )
        traffic.push({
          day,
          source: s.source === 'ig' ? 'ig' : s.source,
          medium: s.medium,
          campaign: s.campaign?.utmCampaign ?? '',
          device,
          landing,
          sessions: n,
          themeViews,
          checkouts,
        })
      }
    }
  }

  // ── Inversión y resultados de cada campaña pagada ─────────────────────────
  const spend: SpendEntry[] = []
  let spendId = 1
  for (const s of sources) {
    const c = s.campaign
    if (!c || s.roas <= 0) continue
    const days: { day: string; sessions: number; sales: number }[] = []
    let revenue = 0
    for (
      let t = Date.parse(`${c.startsOn < dataStart ? dataStart : c.startsOn}T12:00:00-03:00`);
      ;
      t += DAY
    ) {
      const day = arDayKey(t)
      if (day > today || (c.endsOn && day > c.endsOn)) break
      const k = statKey(s.key, day)
      revenue += stats.get(k)?.revenue ?? 0
      if (s.pull(day) > 0)
        days.push({ day, sessions: sessionsOf.get(k) ?? 0, sales: stats.get(k)?.sales ?? 0 })
    }
    if (days.length === 0) continue
    const total = revenue / s.roas
    const weights = days.map((d) => Math.max(d.sessions, 1) * (0.9 + rng.float() * 0.2))
    const sum = weights.reduce((a, b) => a + b, 0)
    days.forEach((d, i) => {
      const spendCents = Math.round((total * weights[i]!) / sum / 100) * 100
      const recent =
        Date.parse(`${today}T12:00:00-03:00`) - Date.parse(`${d.day}T12:00:00-03:00`) < 7 * DAY
      const ctr = s.ctr * (0.85 + rng.float() * 0.3) * (recent && s.fatigue ? s.fatigue : 1)
      const clicks = Math.max(Math.round((d.sessions / 0.82) * (0.94 + rng.float() * 0.12)), 0)
      spend.push({
        id: `sp-${spendId++}`,
        campaignId: c.id,
        day: d.day,
        spendCents,
        impressions: ctr > 0 ? Math.round(clicks / ctr) : 0,
        clicks,
        platformConversions: Math.round(
          d.sales * (s.channel === 'google' ? 1.05 : 1.15 + rng.float() * 0.3),
        ),
      })
    })
    // Presupuesto diario: lo que viene gastando (las siempre prendidas crecen con el negocio).
    const recentDays = spend.filter((e) => e.campaignId === c.id).slice(-14)
    const avg = recentDays.reduce((a, e) => a + e.spendCents, 0) / Math.max(recentDays.length, 1)
    c.dailyBudgetCents = Math.round(avg / 50_000) * 50_000 || 50_000
  }

  // La campaña del Día de la Madre que viene: el doble y un poco más que la del año pasado.
  const next = campaigns.find((c) => c.id === cid(7))
  if (next) {
    const last = campaigns.find((c) => c.id === cid(3))?.dailyBudgetCents ?? 300_000
    next.dailyBudgetCents = Math.max(Math.round((last * 2.2) / 50_000) * 50_000, 300_000)
  }

  // Presupuesto del mes: el diario de cada campaña activa por los días que corre este mes.
  const monthStart = arDayKey(arStartOfMonth(now))
  const monthEnd = arDayKey(arStartOfMonth(now, 1).getTime() - DAY)
  const planned = campaigns
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => {
      const from = c.startsOn > monthStart ? c.startsOn : monthStart
      const to = c.endsOn && c.endsOn < monthEnd ? c.endsOn : monthEnd
      const days = to < from ? 0 : Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1
      return sum + c.dailyBudgetCents * days
    }, 0)
  const monthlyBudgetCents = Math.ceil((planned * 1.04) / 1_000_000) * 1_000_000

  return {
    settings: {
      monthlyBudgetCents,
      targetMarginBps: 3000,
      defaultModel: 'last',
      updatedAt: new Date(now.getTime() - 20 * DAY).toISOString(),
    },
    campaigns: campaigns.sort((a, b) => b.startsOn.localeCompare(a.startsOn)),
    spend,
    traffic,
    attributions,
  }
}
