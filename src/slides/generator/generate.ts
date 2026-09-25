import { ThemeListingSchema, type ThemeListing } from '@/domain/catalog'
import type { Plan } from '@/domain/plans'
import { parseThemeConfig } from '../config'
import { withDefaultPlans } from '../plans'
import { accent, br, highlight, rich, type RichNode, type RichText } from '../rich-text'
import type { ThemeConfigInput } from '../theme-config'
import {
  ARCHETYPE_SPECS,
  GENERAL_SPEC,
  resolveArchetype,
  type Archetype,
  type ArchetypePalette,
} from './archetypes'

/**
 * Generador de temáticas: de un nombre ("Día de la Madre", "Mascotas",
 * "Egresados 2026") a una temática completa lista para revisar y publicar.
 *
 * Detecta la ocasión con la biblioteca de arquetipos, elige paleta y fotos,
 * escribe los textos de cada slide y asigna cada slide a un plan. Es
 * determinístico: el mismo nombre da la misma temática (la `variant` cambia
 * paleta y fotos para "probar otra"). El resultado siempre pasa el contrato
 * de las slides: si no, es un bug del generador y se lanza un error.
 */

export const ARCHETYPES: Archetype[] = ARCHETYPE_SPECS.map(resolveArchetype)
export const GENERAL_ARCHETYPE: Archetype = resolveArchetype(GENERAL_SPEC)

export const MAX_BATCH = 30

export type Structure = 'completa' | 'compacta'

export interface GeneratorOptions {
  plans: readonly Pick<Plan, 'slug' | 'rank' | 'name' | 'active'>[]
  /** Slugs ya usados: el generado no los pisa (agrega -2, -3…). */
  existingSlugs?: Iterable<string>
  /** Otra variante del mismo nombre: cambia paleta y fotos. */
  variant?: number
  structure?: Structure
  sortOrder?: number
}

export interface GeneratorStep {
  label: string
  detail: string
}

export interface GeneratedTheme {
  slug: string
  name: string
  category: string
  description: string
  sortOrder: number
  listing: ThemeListing
  config: ThemeConfigInput
  archetype: {
    id: string
    label: string
    emoji: string
    confidence: 'alta' | 'media' | 'baja'
    matched: string[]
  }
  palette: ArchetypePalette
  structure: Structure
  variant: number
  steps: GeneratorStep[]
}

// ── Texto ───────────────────────────────────────────────────────────────────

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(text: string): string {
  return normalize(text).replace(/\s/g, '-').slice(0, 60).replace(/-+$/g, '') || 'tematica'
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) {
    const candidate = `${base.slice(0, 56)}-${i}`
    if (!taken.has(candidate)) return candidate
  }
}

/** "  día   de la madre " → "Día de la madre". */
export function cleanName(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim().slice(0, 80)
  return collapsed.charAt(0).toLocaleUpperCase('es-AR') + collapsed.slice(1)
}

/**
 * La lista que pega el admin: una temática por línea (o separadas por comas o
 * punto y coma). Saca viñetas y numeración, repetidos y líneas vacías.
 */
export function parseThemeList(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const parts = text.includes('\n') ? text.split(/\r?\n/) : text.split(/[;,]/)
  for (const raw of parts) {
    const name = cleanName(raw.replace(/^\s*(?:[-*•·]|\d+[.)-])\s*/, ''))
    if (name.length < 2) continue
    const key = normalize(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= MAX_BATCH) break
  }
  return out
}

function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// ── Detección ───────────────────────────────────────────────────────────────

export interface Detection {
  archetype: Archetype
  matched: string[]
  score: number
}

/**
 * La ocasión que mejor coincide con el nombre. Cada palabra clave suma su
 * largo (las más específicas pesan más); `=palabra` exige la palabra entera y
 * las frases se buscan tal cual. Sin coincidencias, la ocasión general.
 */
export function detectArchetype(name: string): Detection {
  const text = normalize(name)
  const words = text.split(' ')
  let best: Detection = { archetype: GENERAL_ARCHETYPE, matched: [], score: 0 }
  for (const archetype of ARCHETYPES) {
    const matched: string[] = []
    let score = 0
    for (const keyword of archetype.keywords) {
      const exact = keyword.startsWith('=')
      const k = exact ? keyword.slice(1) : keyword
      const hit = k.includes(' ')
        ? ` ${text} `.includes(` ${k}`)
        : words.some((w) => (exact ? w === k : w.startsWith(k)))
      if (hit) {
        matched.push(k)
        score += k.length
      }
    }
    if (score > best.score) best = { archetype, matched, score }
  }
  return best
}

// ── Armado ──────────────────────────────────────────────────────────────────

const photo = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${width}&auto=format&fit=crop`

/** "¡FELIZ\nCUMPLE!" → texto enriquecido con saltos de línea. */
function lines(text: string, mark?: (line: string, i: number) => RichNode | null): RichText {
  const nodes: (string | RichNode)[] = []
  text.split('\n').forEach((line, i) => {
    if (i > 0) nodes.push(br)
    nodes.push(mark?.(line, i) ?? line)
  })
  return rich(...nodes)
}

const LOVE = new Set(['amor', 'boda', 'distancia', 'perdon'])

type Slide = ThemeConfigInput['slides'][number]

function buildSlides(a: Archetype, photos: string[], structure: Structure): Slide[] {
  const c = a.copy
  const love = LOVE.has(a.id)
  const particles = a.particles
  const mainPhoto = photos[0]!
  const altPhoto = photos[1] ?? mainPhoto

  const cover: Slide =
    a.cover === 'friends'
      ? {
          key: 'portada',
          kind: 'cover.friends',
          props: {
            badge: c.edition,
            quote: lines(c.friendsQuote ?? '"Hay personas que hacen\nque todo sea mejor."'),
            thanks: c.thanksText,
            emojiTop: a.emoji,
            emojiBottom: '✨',
            senderPrefix: 'De:',
          },
        }
      : a.cover === 'birthday'
        ? {
            key: 'portada',
            kind: 'cover.birthday',
            props: { title: lines(c.birthdayTitle ?? '¡FELIZ\nDÍA!') },
          }
        : {
            key: 'portada',
            kind: 'cover.recipient',
            props: { label: c.coverLabel, senderPrefix: c.senderPrefix },
            frame: love ? undefined : { particles },
          }

  const editorial: Slide = {
    key: 'revista',
    kind: 'story.editorial',
    props: love
      ? { fallbackImage: photo(altPhoto, 1887) }
      : {
          title: rich('¿Quién', br, accent('sos vos'), br, 'para mí?'),
          body1: rich(
            'Cuando pienso en vos, pienso en todo lo que significás en mi vida. Sos ',
            highlight('alguien único'),
            ', de esas personas que hacen que los días grises tengan color.',
          ),
          body2: rich(
            'Sos compañía, alegría y ese empujón que siempre llega a tiempo. Con vos aprendí que los momentos simples son los que más valen.',
          ),
          fallbackImage: photo(altPhoto, 1887),
        },
  }

  const all: Record<string, Slide> = {
    intro: { key: 'intro', kind: 'intro.logo' },
    portada: cover,
    bienvenida: {
      key: 'bienvenida',
      kind: 'story.intro',
      props: { greeting: c.greeting, tag: c.edition, title: c.thought, message: c.message },
    },
    dedicatoria: {
      key: 'dedicatoria',
      kind: 'story.dedication',
      props: {
        heading: c.dedicationHeading,
        defaultText: c.dedicationDefault,
        defaultImage: photo(mainPhoto, 2070),
      },
    },
    cancion: { key: 'cancion', kind: 'media.song', props: { caption: c.songCaption } },
    playlists: { key: 'playlists', kind: 'media.playlists' },
    'game-start': { key: 'game-start', kind: 'connector.gamer' },
    trivia: {
      key: 'trivia',
      kind: 'game.trivia',
      props: { introTitle: c.triviaTitle, questions: c.trivia },
    },
    cine: { key: 'cine', kind: 'connector.cinema' },
    streaming: { key: 'streaming', kind: 'media.streaming' },
    jackpot: { key: 'jackpot', kind: 'game.jackpot' },
    cuponera: {
      key: 'cuponera',
      kind: 'game.coupons',
      props: { suggestions: c.coupons.slice(0, 8) },
    },
    revista: editorial,
    razones: {
      key: 'razones',
      kind: 'story.reasons',
      props: {
        title: c.reasonsTitle,
        subtitle: c.reasonsSubtitle,
        finalTitle: c.reasonsFinal[0],
        finalText: c.reasonsFinal[1],
        suggestions: c.reasons.slice(0, 10),
      },
    },
    gratitud: { key: 'gratitud', kind: 'reflect.gratitude' },
    diario: { key: 'diario', kind: 'reflect.journal' },
    fortuna: { key: 'fortuna', kind: 'game.fortune', props: { fortunes: c.fortunes } },
    anecdota: {
      key: 'anecdota',
      kind: 'story.anecdote',
      props: { defaultTitle: c.anecdoteTitle, fallbackImage: photo(altPhoto, 1000) },
    },
    repaso: { key: 'repaso', kind: 'outro.summary' },
    gracias: {
      key: 'gracias',
      kind: 'outro.thanks',
      props: { title: c.thanksTitle, text: c.thanksText },
      frame: love ? undefined : { particles },
    },
  }

  const order =
    structure === 'compacta'
      ? [
          'intro',
          'portada',
          'bienvenida',
          'dedicatoria',
          'cancion',
          'game-start',
          'trivia',
          'cuponera',
          'razones',
          'anecdota',
          'repaso',
          'gracias',
        ]
      : [
          'intro',
          'portada',
          'bienvenida',
          'dedicatoria',
          'cancion',
          'playlists',
          'game-start',
          'trivia',
          'cine',
          'streaming',
          'jackpot',
          'cuponera',
          'revista',
          'razones',
          'gratitud',
          'diario',
          'fortuna',
          'anecdota',
          'repaso',
          'gracias',
        ]
  return order.map((key) => {
    const slide = all[key]!
    // Sin `frame: undefined` ni `props` vacíos: la configuración queda limpia.
    const { frame, ...rest } = slide
    return frame ? slide : rest
  })
}

function features(a: Archetype): string[] {
  const [c0, c1] = a.copy.coupons
  return [
    'Portada con su nombre y una bienvenida animada.',
    'Carta dedicatoria sobre tu foto favorita.',
    'Su canción sonando a pantalla completa.',
    `${a.copy.reasonsTitle} escritas por vos, una por una.`,
    `Cuponera con vales como "${c0}" o "${c1}".`,
  ]
}

const COVER_LABEL: Record<Archetype['cover'], string> = {
  recipient: 'Portada con su nombre',
  friends: 'Portada con frase y emojis',
  birthday: 'Portada de fiesta con torta',
}

export function generateTheme(input: string, options: GeneratorOptions): GeneratedTheme {
  const name = cleanName(input)
  if (name.length < 2) throw new Error('El nombre de la temática es muy corto')
  const variant = Math.max(0, Math.floor(options.variant ?? 0))
  const structure = options.structure ?? 'completa'
  const taken = new Set(options.existingSlugs ?? [])
  const slug = uniqueSlug(slugify(name), taken)

  const { archetype: a, matched, score } = detectArchetype(name)
  const seed = hash(slugify(name))
  const palette = a.palettes[(seed + variant) % a.palettes.length]!
  const rotation = variant % a.photos.length
  const photos = [...a.photos.slice(rotation), ...a.photos.slice(0, rotation)]

  const slides = withDefaultPlans(buildSlides(a, photos, structure), options.plans)
  const config: ThemeConfigInput = {
    palette: { primary: palette.primary, ink: palette.ink, accent: palette.accent },
    slides,
  }
  const parsed = parseThemeConfig(config)
  if (!parsed.success)
    throw new Error(`El generador armó una temática inválida:\n${parsed.issues.join('\n')}`)

  const listing = ThemeListingSchema.parse({
    title: a.listing.title,
    highlight: name.slice(0, 40),
    subtitle: a.listing.subtitle,
    cardDescription: a.listing.card,
    cardColor: palette.card,
    cardTone: palette.tone,
    images: photos.slice(0, 2).map((id, i) => photo(id, i === 0 ? 1200 : 800)),
    features: features(a),
    guide: { emoji: a.emoji, title: a.listing.guideTitle, text: a.listing.guideText },
  })

  const plansUsed = new Set(slides.map((s) => s.plan).filter(Boolean)).size
  const confidence = score === 0 ? 'baja' : score >= 5 ? 'alta' : 'media'
  const steps: GeneratorStep[] = [
    {
      label: 'Ocasión',
      detail:
        score === 0
          ? `${a.emoji} Sin coincidencias: celebración general`
          : `${a.emoji} ${a.label} (por "${matched.join('", "')}")`,
    },
    { label: 'Paleta', detail: palette.name },
    { label: 'Portada', detail: COVER_LABEL[a.cover] },
    {
      label: 'Pantallas',
      detail: `${slides.length} pantallas repartidas en ${plansUsed || 1} ${plansUsed === 1 ? 'plan' : 'planes'}`,
    },
    {
      label: 'Textos',
      detail: `${a.copy.reasons.length} razones, ${a.copy.coupons.length} vales y ${a.copy.trivia.length} preguntas`,
    },
    { label: 'Fotos', detail: `${Math.min(photos.length, 2)} fotos de referencia` },
    { label: 'Validación', detail: 'Cumple el contrato de todas las slides' },
  ]

  return {
    slug,
    name,
    category: a.category,
    description: a.listing.card,
    sortOrder: options.sortOrder ?? 100,
    listing,
    config,
    archetype: { id: a.id, label: a.label, emoji: a.emoji, confidence, matched },
    palette,
    structure,
    variant,
    steps,
  }
}

/** Genera un lote respetando los slugs que se van usando dentro del mismo lote. */
export function generateBatch(
  names: readonly string[],
  options: GeneratorOptions,
): GeneratedTheme[] {
  const taken = new Set(options.existingSlugs ?? [])
  return names.map((name, i) => {
    const theme = generateTheme(name, {
      ...options,
      existingSlugs: taken,
      sortOrder: (options.sortOrder ?? 100) + i,
    })
    taken.add(theme.slug)
    return theme
  })
}
