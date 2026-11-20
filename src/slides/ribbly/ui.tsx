'use client'

import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion'
import {
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { EmojiText } from '@/ui/Icon'
import { spring } from '../player/motion'
import { PIECE_ID } from '../layout'
import { useSlideStyle } from '../style-context'
import type { SlideContext } from '../types'
import { DecoLayer } from './deco'
import { ORIGINAL, paletteOf, typePairOf, type Deco, type Tone } from './style-kit'
import { fill } from './vars'
import './ribbly.css'
import './screens-a.css'
import './screens-b.css'
import './screens-c.css'

/**
 * Piezas compartidas de las pantallas nuevas de Ribbly: el escenario
 * (contenedor responsive), botones, chips, la marca y el aviso de guardar.
 * Los estilos están en ribbly.css.
 */

/**
 * En el editor directo, marca un elemento como editable: el editor dibuja
 * encima un recuadro y, al tocarlo, abre el campo `path` del comprador de esta
 * slide (p. ej. `wish`, `moments.2`, `@recipientName` para el nombre).
 * Siempre la marca con `data-mv` (su campo o sus estilos): así lo que el
 * comprador movió o agrandó se ve también en el regalo (src/slides/layout.ts).
 */
export function editable(
  ctx: SlideContext,
  path: string,
  /**
   * Ejes de estilo de esta pieza (`torta,velas`): al tocarla, sus opciones
   * aparecen en el mismo globo, debajo de los campos (src/slides/styles.ts).
   */
  styles?: string,
): { 'data-edit'?: string; 'data-style'?: string; 'data-mv'?: string } {
  const id = path || styles || ''
  const mv = PIECE_ID.test(id) ? { 'data-mv': id } : {}
  if (!ctx.editing) return mv
  return {
    ...mv,
    ...(path ? { 'data-edit': path } : {}),
    ...(styles ? { 'data-style': styles } : {}),
  }
}

/**
 * Una pieza del dibujo que se puede mover y agrandar aunque no tenga campos ni
 * estilos (la caja del regalo, las galletitas, la libreta): en el editor
 * directo tiene su recuadro con "Mover y cambiar tamaño" (src/slides/layout.ts).
 * Con `editable` en el mismo elemento, va después (su id manda).
 */
export function piece(ctx: SlideContext, id: string): { 'data-mv': string; 'data-piece'?: string } {
  return { 'data-mv': id, ...(ctx.editing ? { 'data-piece': '' } : {}) }
}

/**
 * Una pieza que solo tiene estilos (los globos de la intro, el telón): en el
 * editor directo marca su lugar para que tenga su lápiz. Fuera del editor no
 * dibuja nada.
 */
export function StyleSpot({
  ctx,
  styles,
  style,
  move = false,
}: {
  ctx: SlideContext
  styles: string
  /** Dónde está la pieza (left/top/width/height, en % del escenario). */
  style: CSSProperties
  /**
   * La pieza se puede mover y agrandar: la pieza de verdad tiene que llevar
   * `data-mv` con estos mismos estilos (la marca se mueve con ella).
   */
  move?: boolean
}) {
  if (!ctx.editing) return null
  return (
    <i
      aria-hidden
      data-style={styles}
      data-mv={move ? styles : undefined}
      style={{ position: 'absolute', pointerEvents: 'none', zIndex: 1, ...style }}
    />
  )
}

/** Medida en "píxeles del diseño": escala con el tamaño del teléfono. */
export const u = (n: number) => `calc(var(--u) * ${n})`

/** Texto de la temática con sus {{variables}} resueltas y los emojis como íconos. */
export function T({
  text,
  ctx,
  extra,
}: {
  text: string | null | undefined
  ctx: SlideContext
  extra?: Record<string, string>
}) {
  return <EmojiText text={fill(text, ctx.vars, extra)} />
}

/**
 * El escenario de cada pantalla. Además de contener, pinta el estilo que
 * eligió el comprador (docs/PLAN-VARIACIONES.md): con otra paleta cambia el
 * fondo (según su `tone`) y los colores base (--rb-coral, --rb-sol…); con otra
 * tipografía, los títulos y lo escrito a mano; y suma la decoración elegida.
 */
export function Stage({
  bg,
  tone = 'vivid',
  className = '',
  style,
  children,
  ...rest
}: {
  /** Fondo CSS (degradé del diseño). */
  bg?: string
  /** Cómo es el fondo, para pintarlo con otra paleta: de color, claro o de noche. */
  tone?: Tone
  className?: string
  style?: CSSProperties
  children: ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'className' | 'children'>) {
  const look = useSlideStyle()
  const palette = paletteOf(look.paleta)
  const type = typePairOf(look.tipo)
  const deco = look.deco && look.deco !== ORIGINAL ? (look.deco as Deco) : null
  const vars = {
    ...(palette
      ? {
          '--rb-coral': palette.primary,
          '--rb-coral-deep': palette.primaryDeep,
          '--rb-sol': palette.accent,
          '--rb-naranja': palette.accent,
          '--rb-cielo': palette.primary,
          '--rb-cielo-p': palette.primaryDeep,
          // Para las piezas con colores propios del diseño (sobres, lomos, tickets):
          // con otra paleta, `var(--rb-p1, <el del diseño>)` toma estos.
          '--rb-p1': palette.primary,
          '--rb-p2': palette.primaryDeep,
          '--rb-a': palette.accent,
          '--rb-noche': palette.night,
          '--rb-crema': palette.cream,
          '--rb-rosa': palette.tint,
          '--rb-tint': palette.tint,
          '--rb-ink': palette.ink,
          '--rb-bg': palette[tone],
        }
      : {}),
    ...(type ? { '--rb-display': type.display, '--rb-hand': type.hand } : {}),
  } as CSSProperties
  return (
    <div
      className={`rb-stage ${className}`}
      data-paleta={palette ? look.paleta : undefined}
      data-tipo={type ? look.tipo : undefined}
      style={{ background: palette ? palette[tone] : bg, ...vars, ...style }}
      {...rest}
    >
      {deco && <DecoLayer kind={deco} palette={palette} />}
      {children}
    </div>
  )
}

type BtnVariant = 'primary' | 'white' | 'dark' | 'glass' | 'yellow'

type BtnProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: BtnVariant
  /** Clases extra: is-wide, is-big, is-small, is-flat, is-ink. */
  mods?: string
  children: ReactNode
  /** Con href es un link que abre en otra pestaña. */
  href?: string
}

/** Botón con el toque de siempre: se hunde al apretar y vuelve con resorte. */
export function Btn({ variant = 'primary', mods = '', children, href, ...props }: BtnProps) {
  const className = `rb-btn rb-btn-${variant} ${mods} ${props.className ?? ''}`
  if (href) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        whileTap={{ scale: 0.95, y: 2 }}
        whileHover={{ y: -2 }}
        transition={spring.snappy}
      >
        {children}
      </motion.a>
    )
  }
  return (
    <motion.button
      type="button"
      whileTap={props.disabled ? undefined : { scale: 0.95, y: 2 }}
      whileHover={props.disabled ? undefined : { y: -2 }}
      transition={spring.snappy}
      {...props}
      className={className}
    >
      {children}
    </motion.button>
  )
}

export function Chip({
  mods = '',
  children,
  style,
}: {
  mods?: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <span className={`rb-chip ${mods}`} style={style}>
      {children}
    </span>
  )
}

/** Isotipo (se tiñe con el color del texto) y, si se pide, el nombre al lado. */
export function Brand({
  size = 20,
  wordmark = true,
  style,
}: {
  /** Alto del texto, en píxeles del diseño. */
  size?: number
  wordmark?: boolean
  style?: CSSProperties
}) {
  return (
    <span className="rb-brand" style={{ fontSize: u(size), ...style }} aria-label="Ribbly">
      <i className="rb-mark" style={{ height: '1.18em' }} aria-hidden />
      {wordmark && <span aria-hidden>RIBBLY</span>}
    </span>
  )
}

/** Marca que late sobre lo que hay que tocar. */
export function TapMark({ style }: { style?: CSSProperties }) {
  return <i className="rb-tap" style={style} aria-hidden />
}

/** Barritas de progreso de un juego. `states` trae el color de cada paso. */
export function Steps({ states }: { states: ('on' | 'warm' | 'ok' | 'bad' | 'off')[] }) {
  const color = { on: '#fff', warm: '#F2A93B', ok: '#22A66B', bad: '#E5484D', off: undefined }
  return (
    <span className="rb-steps" aria-hidden>
      {states.map((state, i) => (
        <i key={i} style={{ background: color[state] }} />
      ))}
    </span>
  )
}

/** Aviso que sube desde abajo: cómo guardar o compartir una pantalla. */
export function Sheet({
  open,
  onClose,
  icon,
  title,
  children,
  closeLabel = '¡Entendido!',
}: {
  open: boolean
  onClose: () => void
  icon?: ReactNode
  title: string
  children: ReactNode
  closeLabel?: string
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="rb-sheet-back"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div
            className="rb-sheet"
            role="dialog"
            aria-modal
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '110%' }}
            animate={{ y: 0, transition: spring.bouncy }}
            exit={{ y: '110%', transition: { duration: 0.22 } }}
          >
            {icon && <div style={{ fontSize: u(46), lineHeight: 1 }}>{icon}</div>}
            <h3>{title}</h3>
            <p>{children}</p>
            <Btn variant="primary" mods="is-wide is-flat" onClick={onClose}>
              {closeLabel}
            </Btn>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Lo que hace quien recibe (vales canjeados, deseos, la cápsula) ──────────

const cache = new Map<string, unknown>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readStored(key: string, fallback: unknown, persisted: boolean): unknown {
  if (!cache.has(key)) {
    let value = fallback
    if (persisted) {
      try {
        const raw = window.localStorage.getItem(key)
        if (raw !== null) value = JSON.parse(raw)
      } catch {
        // Sin almacenamiento (modo privado): queda en memoria.
      }
    }
    cache.set(key, value)
  }
  return cache.get(key)
}

/**
 * Estado de lo que hace quien recibe, por regalo y por slide. En el regalo se
 * guarda en su dispositivo: si vuelve a abrir su Ribbly, los vales canjeados
 * siguen canjeados. En la vista previa (ejemplo, editor, panel) vive solo en
 * memoria: se pierde al recargar y no se mezcla con ningún regalo.
 *
 * `slideKey` permite leer lo de otra slide (el repaso lee el puntaje de la
 * trivia; la cápsula, los deseos de las velitas).
 */
export function useStored<T>(
  ctx: SlideContext,
  name: string,
  initial: T,
  slideKey: string = ctx.slideKey,
): [T, (next: SetStateAction<T>) => void] {
  const [fallback] = useState(initial)
  const persisted = !ctx.preview
  const key =
    typeof window === 'undefined'
      ? ''
      : `ribbly:${persisted ? 'regalo' : 'vista-previa'}:${window.location.pathname}:${slideKey}:${name}`

  const stored = useSyncExternalStore(
    subscribe,
    () => readStored(key, fallback, persisted) as T,
    () => fallback,
  )

  const set = (next: SetStateAction<T>) => {
    const current = readStored(key, fallback, persisted) as T
    const value = typeof next === 'function' ? (next as (prev: T) => T)(current) : next
    cache.set(key, value)
    if (persisted) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Queda en memoria.
      }
    }
    listeners.forEach((listener) => listener())
  }
  return [stored, set]
}

/** La primera slide del regalo de un tipo dado (para leer lo que cargó el comprador ahí). */
export function slideOfKind(ctx: SlideContext, kind: string): string | undefined {
  return ctx.slides.find((s) => s.kind === kind)?.key
}
