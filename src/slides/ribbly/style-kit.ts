import type { StyleAxis, StyleOption } from '../styles'

/**
 * El kit de estilos de las pantallas de Ribbly (docs/PLAN-VARIACIONES.md):
 * los ejes comunes (paleta, tipografía, decoración) y los datos con los que
 * se dibujan. Sin React: lo usan las definiciones (servidor) y el player.
 *
 * La opción `original` de cada eje es el diseño tal como viene: no cambia
 * nada. Las demás pisan colores, tipografías o piezas.
 */

export const ORIGINAL = 'original'

// ── Paletas ─────────────────────────────────────────────────────────────────

export interface RbPalette {
  label: string
  /** Fondo de color (texto blanco encima). */
  vivid: string
  /** Fondo claro (texto oscuro encima). */
  soft: string
  /** Fondo oscuro, de noche (texto blanco encima). */
  deep: string
  /** Acento fuerte: botones, destacados (pisa --rb-coral). */
  primary: string
  primaryDeep: string
  /** Segundo acento, cálido (pisa --rb-sol). */
  accent: string
  /** Tono claro del acento: tarjetas, chips. */
  tint: string
  /** Texto sobre fondos claros. */
  ink: string
  /** Un color sólido de noche (pisa --rb-noche). */
  night: string
  /** Un color sólido claro (pisa --rb-crema). */
  cream: string
  /** Confeti y papelitos. */
  party: string[]
  /** Globos: principal, claro y el tercero. */
  balloons: [string, string, string]
}

export const PALETTES: Record<string, RbPalette> = {
  chicle: {
    label: 'Rosa chicle',
    vivid: 'linear-gradient(172deg, #F2508A 0%, #FF78A4 55%, #FF9DBA 100%)',
    soft: 'linear-gradient(180deg, #FFF6F9 0%, #FFE5EE 100%)',
    deep: 'linear-gradient(180deg, #3B1030 0%, #5B1A45 60%, #7A2457 100%)',
    primary: '#EC407A',
    primaryDeep: '#B5245A',
    accent: '#FFC94D',
    tint: '#FFE0EA',
    ink: '#3A1426',
    night: '#4A1539',
    cream: '#FFF4F7',
    party: ['#EC407A', '#FFC94D', '#FFFFFF', '#FF9EC0', '#B98CFF'],
    balloons: ['#EC407A', '#FFC2D6', '#FFD978'],
  },
  cielo: {
    label: 'Cielo',
    vivid: 'linear-gradient(172deg, #3B88D6 0%, #55A7E6 55%, #7DBDEB 100%)',
    soft: 'linear-gradient(180deg, #F2F8FE 0%, #DCEDFB 100%)',
    deep: 'linear-gradient(180deg, #0E2342 0%, #173A66 60%, #1F4C82 100%)',
    primary: '#2F7FD0',
    primaryDeep: '#1D5C9E',
    accent: '#FFD166',
    tint: '#DCEDFB',
    ink: '#10263F',
    night: '#132E54',
    cream: '#F2F8FE',
    party: ['#2F7FD0', '#FFD166', '#FFFFFF', '#8CCBF2', '#5ED6A8'],
    balloons: ['#3B88D6', '#BFE0F7', '#FFE08A'],
  },
  lavanda: {
    label: 'Lavanda',
    vivid: 'linear-gradient(172deg, #7A57D6 0%, #9B77E6 55%, #BE97EE 100%)',
    soft: 'linear-gradient(180deg, #F8F4FE 0%, #ECE2FC 100%)',
    deep: 'linear-gradient(180deg, #1C1238 0%, #2F1F5E 60%, #432C80 100%)',
    primary: '#7A52DF',
    primaryDeep: '#5636A8',
    accent: '#FFB8DE',
    tint: '#ECE2FC',
    ink: '#241A40',
    night: '#28194F',
    cream: '#F8F4FE',
    party: ['#7A52DF', '#FFB8DE', '#FFFFFF', '#C9A2F0', '#FFD166'],
    balloons: ['#8E6BE8', '#E3D3FA', '#FFC2E2'],
  },
  menta: {
    label: 'Menta',
    vivid: 'linear-gradient(172deg, #17A08A 0%, #33BAA0 55%, #5FCCB3 100%)',
    soft: 'linear-gradient(180deg, #F1FBF7 0%, #DAF3EA 100%)',
    deep: 'linear-gradient(180deg, #0A2925 0%, #11433C 60%, #185A50 100%)',
    primary: '#129880',
    primaryDeep: '#0E7262',
    accent: '#FFC857',
    tint: '#D6F2E8',
    ink: '#0F2E29',
    night: '#0F3832',
    cream: '#F1FBF7',
    party: ['#129880', '#FFC857', '#FFFFFF', '#74D8BF', '#FF8FB1'],
    balloons: ['#2BB89C', '#C5EEDF', '#FFD98A'],
  },
  atardecer: {
    label: 'Atardecer',
    vivid: 'linear-gradient(172deg, #EE5F55 0%, #F9875E 55%, #FCAB6E 100%)',
    soft: 'linear-gradient(180deg, #FFF8F0 0%, #FFE9D6 100%)',
    deep: 'linear-gradient(180deg, #2A1430 0%, #4A2040 60%, #6E2C48 100%)',
    primary: '#E9584A',
    primaryDeep: '#B8392E',
    accent: '#FFD166',
    tint: '#FFE4D2',
    ink: '#3A1C14',
    night: '#3D1B38',
    cream: '#FFF8F0',
    party: ['#E9584A', '#FFD166', '#FFFFFF', '#FDB876', '#B98CFF'],
    balloons: ['#F2665A', '#FFD2B8', '#FFE08A'],
  },
}

export function paletteOf(value: string | undefined): RbPalette | null {
  return (value && PALETTES[value]) || null
}

/** Cómo es el fondo de una pantalla: de color, claro o de noche. */
export type Tone = 'vivid' | 'soft' | 'deep'

// ── Tipografías ─────────────────────────────────────────────────────────────

export interface RbTypePair {
  label: string
  /** Títulos (pisa a Fredoka). */
  display: string
  /** Lo escrito a mano (pisa a Caveat). */
  hand: string
}

export const TYPE_PAIRS: Record<string, RbTypePair> = {
  elegante: {
    label: 'Elegante',
    display: 'var(--font-playfair), Georgia, serif',
    hand: 'var(--font-dancing), cursive',
  },
  moderna: {
    label: 'Moderna',
    display: 'var(--font-outfit), system-ui, sans-serif',
    hand: 'var(--font-dancing), cursive',
  },
  marcador: {
    label: 'Marcador',
    display: 'var(--font-marker), cursive',
    hand: 'var(--font-caveat), cursive',
  },
  suave: {
    label: 'Suave',
    display: 'var(--font-nunito), system-ui, sans-serif',
    hand: 'var(--font-caveat), cursive',
  },
}

export function typePairOf(value: string | undefined): RbTypePair | null {
  return (value && TYPE_PAIRS[value]) || null
}

// ── Decoración ──────────────────────────────────────────────────────────────

/** Lo que se suma alrededor del contenido (ribbly/deco.tsx lo dibuja). */
export const DECOS = ['globos', 'banderines', 'estrellas', 'corazones', 'confeti'] as const
export type Deco = (typeof DECOS)[number]

const DECO_LABELS: Record<Deco, string> = {
  globos: 'Globos',
  banderines: 'Banderines',
  estrellas: 'Estrellas',
  corazones: 'Corazones',
  confeti: 'Confeti',
}

// ── Ejes ────────────────────────────────────────────────────────────────────

const original = (label = 'Como viene'): StyleOption => ({ value: ORIGINAL, label })

export const PALETTE_AXIS: StyleAxis = {
  key: 'paleta',
  label: 'Colores',
  global: true,
  options: [
    { ...original(), swatch: ['#FF6B8A', '#FFC46B'] },
    ...Object.entries(PALETTES).map(([value, p]) => ({
      value,
      label: p.label,
      swatch: [p.primary, p.accent] as const,
    })),
  ],
}

export const TYPE_AXIS: StyleAxis = {
  key: 'tipo',
  label: 'Tipografía',
  global: true,
  options: [
    { ...original(), font: 'var(--font-fredoka), sans-serif' },
    ...Object.entries(TYPE_PAIRS).map(([value, t]) => ({ value, label: t.label, font: t.display })),
  ],
}

/** Decoración: `skip` quita las que la pantalla ya trae (para no repetir). */
export function decoAxis(skip: readonly Deco[] = []): StyleAxis {
  return {
    key: 'deco',
    label: 'Decoración',
    options: [
      original(),
      ...DECOS.filter((d) => !skip.includes(d)).map((d) => ({ value: d, label: DECO_LABELS[d] })),
    ],
  }
}

/** Un eje propio de una pantalla: la primera opción es la del diseño. */
export function pieceAxis(
  key: string,
  label: string,
  options: readonly (readonly [string, string])[],
  anchor?: string,
): StyleAxis {
  return {
    key,
    label,
    ...(anchor ? { anchor } : {}),
    options: options.map(([value, optionLabel]) => ({ value, label: optionLabel })),
  }
}
