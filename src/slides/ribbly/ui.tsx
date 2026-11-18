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
import type { SlideContext } from '../types'
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
 * Fuera del editor no agrega nada.
 */
export function editable(ctx: SlideContext, path: string): { 'data-edit'?: string } {
  return ctx.editing ? { 'data-edit': path } : {}
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

export function Stage({
  bg,
  className = '',
  style,
  children,
  ...rest
}: {
  /** Fondo CSS (degradé del diseño). */
  bg?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'className' | 'children'>) {
  return (
    <div className={`rb-stage ${className}`} style={{ background: bg, ...style }} {...rest}>
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
