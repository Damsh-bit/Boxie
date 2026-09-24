'use client'

import {
  AnimatePresence,
  motion,
  MotionConfig,
  useIsPresent,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
} from 'framer-motion'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from './cn'

/**
 * Sistema de movimiento de Boxie (framer-motion).
 *
 * Todo lo que se mueve en el sitio, el editor y el regalo sale de estas
 * curvas y resortes, así la marca se siente igual en todos lados. Reglas:
 *  · Entradas con `ease.out` (arrancan rápido y frenan suave).
 *  · Interacciones (botones, tarjetas, toggles) con resortes: siguen al dedo
 *    y nunca cortan en seco.
 *  · Loops decorativos con `transform`/`opacity` en string: framer-motion los
 *    manda al compositor (WAAPI) y no se traban aunque React esté ocupado.
 *  · `prefers-reduced-motion`: MotionConfig apaga los desplazamientos y los
 *    loops no arrancan (ver `useCalm`).
 */

export const ease = {
  /** Frenada suave: entradas y reveals. */
  out: [0.22, 1, 0.36, 1],
  /** Ida y vuelta: cambios de estado y loops. */
  inOut: [0.65, 0, 0.35, 1],
  /** Salidas: aceleran y se van. */
  in: [0.55, 0, 1, 0.45],
} as const

export const spring = {
  /** Botones, íconos, toggles: respuesta inmediata, casi sin rebote. */
  snappy: { type: 'spring', visualDuration: 0.28, bounce: 0.18 },
  /** Paneles, tarjetas, layout: suave y sin rebote visible. */
  soft: { type: 'spring', visualDuration: 0.45, bounce: 0.08 },
  /** Entradas con carácter (stickers, premios, íconos que aparecen). */
  bouncy: { type: 'spring', visualDuration: 0.55, bounce: 0.38 },
  /** Movimientos grandes (slides, hojas, overlays). */
  gentle: { type: 'spring', visualDuration: 0.65, bounce: 0.12 },
} as const satisfies Record<string, Transition>

/** Proveedor global: respeta la preferencia del sistema y fija el resorte por defecto. */
export function MotionProvider({ children }: { children: ReactNode }) {
  // Desde acá framer-motion maneja los reveals (apaga la red de seguridad de globals.css).
  useEffect(() => {
    document.documentElement.dataset.hydrated = ''
  }, [])
  return (
    <MotionConfig reducedMotion="user" transition={spring.soft}>
      {children}
    </MotionConfig>
  )
}

/** true si el sistema pide menos movimiento: los loops decorativos no se animan. */
export function useCalm(): boolean {
  return useReducedMotion() ?? false
}

/**
 * `motion.p`, `motion.span` y `motion.div` para avisos que entran y salen de
 * un AnimatePresence ("Guardado", "Cupón aplicado", un error). Lo que sale se
 * sigue viendo unos instantes, pero ya no vale: un "Guardado" que se está
 * yendo no puede seguir anunciándose como vigente (ni a un lector de pantalla
 * ni a quien lo lee para decidir), así que se marca `aria-hidden`. El `ref`
 * llega en las props, como pide `popLayout`.
 */
export const Notice = {
  p: function NoticeP(props: HTMLMotionProps<'p'>) {
    const leaving = !useIsPresent()
    return <motion.p {...props} aria-hidden={leaving || props['aria-hidden']} />
  },
  span: function NoticeSpan(props: HTMLMotionProps<'span'>) {
    const leaving = !useIsPresent()
    return <motion.span {...props} aria-hidden={leaving || props['aria-hidden']} />
  },
  div: function NoticeDiv(props: HTMLMotionProps<'div'>) {
    const leaving = !useIsPresent()
    return <motion.div {...props} aria-hidden={leaving || props['aria-hidden']} />
  },
}

// ── Reveals ────────────────────────────────────────────────────────────────

const tags = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  aside: motion.aside,
  footer: motion.footer,
  figure: motion.figure,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  dl: motion.dl,
  p: motion.p,
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
}

type Tag = keyof typeof tags

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'viewport'> {
  as?: Tag
  /** Segundos antes de arrancar. */
  delay?: number
  /** Desde dónde llega (px). */
  y?: number
  x?: number
  scale?: number
  /**
   * Qué parte tiene que estar a la vista para arrancar (0 a 1). Por defecto
   * arranca cuando asoma un 10% de la pantalla, sea del tamaño que sea.
   */
  amount?: number
  once?: boolean
}

/** Arrancar cuando el elemento ya subió un poco en la pantalla (sirve para cualquier alto). */
const VIEWPORT_MARGIN = '0px 0px -10% 0px'

/**
 * Aparece al entrar en pantalla. Sirve dentro de páginas de servidor: solo
 * recibe números y strings. Sin JavaScript se ve igual (ver `NoScriptReveal`).
 */
export function Reveal({
  as = 'div',
  delay = 0,
  y = 28,
  x = 0,
  scale = 1,
  amount,
  once = true,
  transition,
  ...props
}: RevealProps) {
  const Component = tags[as] as typeof motion.div
  return (
    <Component
      data-reveal=""
      initial={{ opacity: 0, x, y, scale }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, amount: amount ?? 'some', margin: VIEWPORT_MARGIN }}
      transition={{ duration: 0.8, ease: ease.out, delay, ...transition }}
      {...props}
    />
  )
}

interface StaggerProps extends Omit<
  HTMLMotionProps<'div'>,
  'initial' | 'whileInView' | 'viewport' | 'variants' | 'animate'
> {
  as?: Tag
  delay?: number
  /** Segundos entre un hijo y el siguiente. */
  step?: number
  amount?: number
  once?: boolean
  /** Arrancar al montarse en vez de al entrar en pantalla (lo que está arriba de todo). */
  immediate?: boolean
}

/** Contenedor que hace aparecer a sus `StaggerItem` de a uno. */
export function Stagger({
  as = 'div',
  delay = 0,
  step = 0.08,
  amount,
  once = true,
  immediate = false,
  ...props
}: StaggerProps) {
  const Component = tags[as] as typeof motion.div
  const variants = {
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } },
  }
  return immediate ? (
    <Component initial="hidden" animate="show" variants={variants} {...props} />
  ) : (
    <Component
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: amount ?? 'some', margin: VIEWPORT_MARGIN }}
      variants={variants}
      {...props}
    />
  )
}

interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  as?: Tag
  y?: number
  x?: number
  scale?: number
  blur?: boolean
}

export function StaggerItem({
  as = 'div',
  y = 24,
  x = 0,
  scale = 1,
  blur = false,
  ...props
}: StaggerItemProps) {
  const Component = tags[as] as typeof motion.div
  return (
    <Component
      data-reveal=""
      variants={{
        hidden: { opacity: 0, x, y, scale, ...(blur ? { filter: 'blur(8px)' } : {}) },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          ...(blur ? { filter: 'blur(0px)' } : {}),
          transition: { duration: 0.75, ease: ease.out },
        },
      }}
      {...props}
    />
  )
}

/**
 * Sin JavaScript no hay quien dispare los reveals: se muestran quietos.
 * Va una sola vez, en el layout raíz.
 */
export function NoScriptReveal() {
  return (
    <noscript>
      <style>{`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
    </noscript>
  )
}

// ── Loops decorativos ──────────────────────────────────────────────────────

interface FloatProps extends Omit<HTMLMotionProps<'div'>, 'animate'> {
  /** Cuánto sube (px). */
  distance?: number
  /** Giro máximo (grados). */
  rotate?: number
  duration?: number
  delay?: number
}

/**
 * Flota suave para siempre. Anima `transform` como string para que corra en
 * el compositor (no se traba con el hilo principal ocupado).
 */
export function Float({
  distance = 12,
  rotate = 0,
  duration = 6,
  delay = 0,
  transition,
  ...props
}: FloatProps) {
  const calm = useCalm()
  const at = (y: number, r: number) => `translateY(${y}px) rotate(${r}deg)`
  return (
    <motion.div
      animate={
        calm
          ? undefined
          : {
              transform: [
                at(0, 0),
                at(-distance, rotate),
                at(0, 0),
                at(distance * 0.4, -rotate),
                at(0, 0),
              ],
            }
      }
      transition={{ duration, ease: 'easeInOut', repeat: Infinity, delay, ...transition }}
      {...props}
    />
  )
}

/** Ruedita de carga. Gira en el compositor, así no se traba mientras la página trabaja. */
export function Spinner({ className }: { className?: string }) {
  return (
    <motion.span
      className={cn('inline-flex shrink-0', className ?? 'size-4')}
      animate={{ transform: ['rotate(0deg)', 'rotate(360deg)'] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      <LoaderCircle className="size-full" />
    </motion.span>
  )
}

// ── Colapsables ────────────────────────────────────────────────────────────

interface CollapseProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'initial'> {
  open: boolean
  children: ReactNode
}

/**
 * Abre y cierra animando la altura. El contenido queda montado (un formulario
 * a medio completar o una foto subiéndose no se pierden al cerrar) y, cerrado,
 * sale del orden de tabulación y del árbol de accesibilidad.
 */
export function Collapse({ open, children, transition, ...props }: CollapseProps) {
  return (
    <motion.div
      initial={false}
      animate={
        open
          ? {
              height: 'auto',
              opacity: 1,
              display: 'block',
              overflow: 'hidden',
              // Abierto, no recorta sombras ni anillos de foco.
              transitionEnd: { overflow: 'visible' },
            }
          : { height: 0, opacity: 0, overflow: 'hidden', transitionEnd: { display: 'none' } }
      }
      transition={{
        height: spring.soft,
        opacity: { duration: open ? 0.3 : 0.15, delay: open ? 0.05 : 0 },
        ...transition,
      }}
      inert={!open}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Acompaña los cambios de alto de su contenido (estados que se reemplazan,
 * mensajes que aparecen) con un resorte en vez de un salto.
 */
export function AutoHeight({ children, className }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  useEffect(() => {
    const el = inner.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ height, overflow: 'hidden', transitionEnd: { overflow: 'visible' } }}
      transition={spring.soft}
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  )
}

// ── Intercambio de contenido ───────────────────────────────────────────────

interface SwapProps {
  /** Cambia la clave y el contenido se reemplaza con un fundido. */
  id: string | number
  children: ReactNode
  className?: string
  /** Desplazamiento vertical del cambio (px). */
  y?: number
  mode?: 'wait' | 'popLayout' | 'sync'
  initial?: boolean
}

/** Reemplaza un contenido por otro con un fundido corto (textos que cambian, estados). */
export function Swap({
  id,
  children,
  className,
  y = 8,
  mode = 'popLayout',
  initial = false,
}: SwapProps) {
  return (
    <AnimatePresence mode={mode} initial={initial}>
      <Notice.span
        key={id}
        className={className}
        initial={{ opacity: 0, y, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -y, filter: 'blur(4px)' }}
        transition={{ duration: 0.25, ease: ease.out }}
      >
        {children}
      </Notice.span>
    </AnimatePresence>
  )
}
