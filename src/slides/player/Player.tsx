'use client'

import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { ParsedSlide, ParsedThemeConfig } from '../config'
import type { BuyerPhoto } from '../fields'
import { slideComponents } from '../registry'
import { slideDefinitions } from '../schemas'
import type { SlideContext } from '../types'
import { ConfettiLayer, FloatingParticles, GradientDrift } from './effects'
import { ease, SLIDE_SPRING, spring } from './motion'
import { useSwipe } from './use-swipe'
import './player.css'

export interface PlayerData {
  recipientName: string
  senderName: string
  /** Contenido del comprador por clave de slide. */
  content: Record<string, Record<string, unknown>>
  /** assetId → URL servible (firmada) de las fotos del comprador. */
  media: Record<string, string>
}

export interface PlayerProps {
  config: ParsedThemeConfig
  data: PlayerData
  /** overlay: pantalla completa (el regalo). embedded: ocupa su contenedor (editor, constructor). */
  variant?: 'overlay' | 'embedded'
  /** Vista previa: el botón de cerrar aparece y nada se registra. */
  preview?: boolean
  onClose?: () => void
  onSlideChange?: (index: number) => void
  initialSlide?: number
  /**
   * Slide a mostrar, controlada desde afuera (la vista previa del editor la
   * mueve al módulo que se está editando). Si cambia, el player va hasta ahí
   * con la misma transición que al deslizar.
   */
  slide?: number
  /** Entrar y salir animado (cuando se abre encima de otra pantalla). */
  animateIn?: boolean
  /** Algo fijo debajo del teléfono (la barra de la Boxie de ejemplo). */
  footer?: ReactNode
  logoUrl?: string
}

const BACKGROUND_CLASS: Record<string, string> = {
  intro: 'bx-bg-intro',
  salmon: 'bx-bg-salmon',
  white: 'bx-bg-white',
  dark: 'bx-bg-dark',
  full: 'bx-bg-full',
  cream: 'bx-bg-cream',
  party: 'bx-bg-party',
  none: '',
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function Player({
  config,
  data,
  variant = 'overlay',
  preview = false,
  onClose,
  onSlideChange,
  initialSlide = 0,
  slide,
  animateIn = false,
  footer,
  logoUrl = '/brand/boxie-logo.png',
}: PlayerProps) {
  const count = config.slides.length
  const [selected, setSelected] = useState(() => Math.max(slide ?? initialSlide, 0))
  // Controlado: si la slide que manda el editor cambia, se la sigue.
  const [lastSlide, setLastSlide] = useState(slide)
  if (slide !== undefined && slide !== lastSlide) {
    setLastSlide(slide)
    setSelected(slide)
  }
  // Si la temática cambia en vivo (constructor) y quedan menos slides, no salirse del rango.
  const current = clamp(selected, 0, count - 1)

  // Un salto de varias slides (el editor abre un módulo lejano) se ve como
  // un solo paso: la slide de origen se queda puesta al lado de la de destino.
  const [previous, setPrevious] = useState(current)
  const [jumpFrom, setJumpFrom] = useState<number | null>(null)
  if (previous !== current) {
    setPrevious(current)
    setJumpFrom(Math.abs(current - previous) > 1 ? previous : null)
  }

  const phoneRef = useRef<HTMLDivElement>(null)
  /** La slide actual como número continuo: el dedo y los resortes mueven esto. */
  const position = useMotionValue(current)

  const change = useCallback(
    (next: number) => {
      setSelected(next)
      onSlideChange?.(next)
    },
    [onSlideChange],
  )

  useEffect(() => {
    const from = position.get()
    const direction = Math.sign(current - from)
    if (Math.abs(current - from) > 1) position.set(current - direction)
    const controls = animate(position, current, {
      ...SLIDE_SPRING,
      onComplete: () => setJumpFrom(null),
    })
    return () => controls.stop()
  }, [current, position])

  const { go } = useSwipe(phoneRef, { index: current, count, position, onChange: change })

  const summaries = useMemo(
    () =>
      config.slides.flatMap((s) => {
        const summary = slideDefinitions[s.kind].summary
        return summary ? [{ key: s.key, ...summary }] : []
      }),
    [config.slides],
  )

  const resolveMedia = useCallback(
    (ref: BuyerPhoto | string | null | undefined) => {
      if (!ref) return undefined
      if (typeof ref === 'string') return ref || undefined
      return data.media[ref.assetId]
    },
    [data.media],
  )

  // Qué slides están montadas y en qué lugar del mazo: la actual y sus
  // vecinas; en un salto, la de origen ocupa el lugar de la vecina.
  const mounted: { index: number; slot: number }[] = []
  const jumpSlot = jumpFrom === null ? null : current + (jumpFrom > current ? 1 : -1)
  for (let index = current - 1; index <= current + 1; index++) {
    if (index < 0 || index >= count || index === jumpSlot) continue
    mounted.push({ index, slot: index })
  }
  if (jumpFrom !== null && jumpSlot !== null) mounted.push({ index: jumpFrom, slot: jumpSlot })

  const style = {
    '--bx-primary': config.palette.primary,
    '--bx-ink': config.palette.ink,
    '--bx-accent': config.palette.accent,
    ...(footer ? { '--bx-footer': '84px' } : {}),
  } as CSSProperties

  const overlay = variant === 'overlay'

  return (
    <motion.div
      className={`bx-player bx-overlay ${overlay ? '' : 'bx-embedded'}`}
      style={style}
      initial={animateIn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={overlay ? { opacity: 0, transition: { duration: 0.3, delay: 0.1 } } : undefined}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        ref={phoneRef}
        className="bx-phone"
        tabIndex={0}
        role="region"
        aria-roledescription="presentación"
        aria-label={`Boxie para ${data.recipientName || 'vos'}`}
        initial={animateIn ? { y: 60, scale: 0.94, opacity: 0 } : false}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={
          overlay
            ? { y: 50, scale: 0.95, opacity: 0, transition: { duration: 0.28, ease: ease.out } }
            : undefined
        }
        transition={spring.gentle}
      >
        <Progress count={count} position={position} keys={config.slides.map((s) => s.key)} />

        {preview && onClose && (
          <motion.button
            type="button"
            onClick={onClose}
            className="bx-close"
            aria-label="Cerrar vista previa"
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={spring.snappy}
          >
            <X size={20} />
          </motion.button>
        )}

        <div className="bx-nav-hint">
          <NavButton label="Slide anterior" disabled={current === 0} onClick={() => go(-1)}>
            <ChevronUp size={18} />
          </NavButton>
          <NavButton
            label="Slide siguiente"
            disabled={current === count - 1}
            onClick={() => go(1)}
            nudge={current === 0}
          >
            <ChevronDown size={18} />
          </NavButton>
        </div>

        {mounted.map(({ index, slot }) => {
          const slideConfig = config.slides[index]!
          const active = index === current
          const ctx: SlideContext = {
            recipientName: data.recipientName,
            senderName: data.senderName,
            palette: config.palette,
            active,
            preview,
            resolveMedia,
            buyerContent: (key) => data.content[key],
            summaries,
            goTo: change,
            logoUrl,
          }
          return (
            <SlideFrame
              key={slideConfig.key}
              slide={slideConfig}
              index={index}
              slot={slot}
              current={current}
              position={position}
            >
              <SlideBody slide={slideConfig} buyer={data.content[slideConfig.key]} ctx={ctx} />
            </SlideFrame>
          )
        })}
      </motion.div>
      {footer && <div className="bx-footer">{footer}</div>}
    </motion.div>
  )
}

/** Segmentos de arriba: se van llenando a medida que se desliza. */
function Progress({
  count,
  position,
  keys,
}: {
  count: number
  position: MotionValue<number>
  keys: string[]
}) {
  return (
    <div className="bx-progress" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Segment key={keys[i] ?? i} index={i} position={position} />
      ))}
    </div>
  )
}

function Segment({ index, position }: { index: number; position: MotionValue<number> }) {
  const fill = useTransform(position, (p) => clamp(p - index + 1, 0, 1))
  const glow = useTransform(position, (p) => (Math.abs(p - index) < 0.5 ? 1 : 0))
  return (
    <div className="bx-progress-segment">
      <motion.span className="bx-progress-fill" style={{ scaleX: fill }} />
      <motion.span className="bx-progress-glow" style={{ opacity: glow }} />
    </div>
  )
}

function NavButton({
  label,
  disabled,
  onClick,
  nudge = false,
  children,
}: {
  label: string
  disabled: boolean
  onClick(): void
  /** En la primera slide, la flecha de "siguiente" invita a seguir. */
  nudge?: boolean
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      animate={{ opacity: disabled ? 0.25 : 1 }}
      whileHover={disabled ? undefined : { scale: 1.1 }}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      transition={spring.snappy}
    >
      <motion.span
        className="grid place-items-center"
        animate={
          nudge
            ? { transform: ['translateY(0px)', 'translateY(3px)', 'translateY(0px)'] }
            : { transform: 'translateY(0px)' }
        }
        transition={
          nudge ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }
        }
      >
        {children}
      </motion.span>
    </motion.button>
  )
}

function SlideBody({
  slide,
  buyer,
  ctx,
}: {
  slide: ParsedSlide
  buyer: unknown
  ctx: SlideContext
}) {
  const Component = slideComponents[slide.kind] as (props: {
    theme: unknown
    buyer: unknown
    ctx: SlideContext
  }) => ReactNode
  const definition = slideDefinitions[slide.kind]
  const buyerProps = definition.buyerSchema
    ? (definition.buyerSchema.safeParse(buyer ?? {}).data ?? {})
    : {}
  return <Component theme={slide.props} buyer={buyerProps} ctx={ctx} />
}

/**
 * Cada slide del mazo. Su lugar sale de `position`: la que viene entra desde
 * abajo tapando a la actual, y la que queda atrás se achica y se oscurece
 * (profundidad). Todo con valores de movimiento: nada se re-renderiza al
 * deslizar.
 */
function SlideFrame({
  slide,
  index,
  slot,
  current,
  position,
  children,
}: {
  slide: ParsedSlide
  index: number
  /** Lugar en el mazo (en un salto, la slide de origen se muestra al lado de la de destino). */
  slot: number
  current: number
  position: MotionValue<number>
  children: ReactNode
}) {
  const { frame } = slide
  const active = index === current
  const rest = frame.fullScreen ? 0 : 30
  const y = useTransform(position, (p) => {
    const d = slot - p
    return d >= 0 ? `${d * 100}%` : `${d * 28}%`
  })
  const scale = useTransform(position, (p) => {
    const d = slot - p
    return d >= 0 ? 1 : Math.max(0.9, 1 + d * 0.08)
  })
  const shade = useTransform(position, (p) => {
    const d = slot - p
    return d >= 0 ? 0 : Math.min(-d, 1) * 0.5
  })
  const radius = useTransform(position, (p) => {
    const moving = Math.min(Math.abs(slot - p) * 5, 1)
    return rest + (30 - rest) * moving
  })

  return (
    <motion.section
      className={`bx-slide ${BACKGROUND_CLASS[frame.background] ?? ''} ${active ? 'is-active' : ''}`}
      aria-hidden={!active}
      inert={!active}
      style={{
        y,
        scale,
        borderRadius: radius,
        zIndex: 20 + (slot - current),
        padding: frame.fullScreen ? 0 : 20,
        overflow: 'hidden',
      }}
    >
      {frame.background === 'intro' && (
        <GradientDrift colors={['#fdfbfb', '#ffe4e6', '#fdf2f3', '#ffe4e6']} />
      )}
      {frame.particles !== 'none' && (
        <FloatingParticles type={frame.particles} seed={index + 1} active={active} />
      )}
      {frame.confetti && <ConfettiLayer seed={index + 11} active={active} />}
      <div className="bx-slide-content">{children}</div>
      <motion.div className="bx-slide-shade" style={{ opacity: shade }} aria-hidden />
    </motion.section>
  )
}
