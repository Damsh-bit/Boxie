'use client'

import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { ParsedSlide, ParsedThemeConfig } from '../config'
import type { BuyerPhoto } from '../fields'
import { slideComponents } from '../registry'
import { slideDefinitions } from '../schemas'
import type { SlideContext } from '../types'
import { ConfettiLayer, FloatingParticles } from './effects'
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

export function Player({
  config,
  data,
  variant = 'overlay',
  preview = false,
  onClose,
  onSlideChange,
  initialSlide = 0,
  logoUrl = '/brand/boxie-logo.png',
}: PlayerProps) {
  const count = config.slides.length
  const [selected, setCurrent] = useState(() => Math.max(initialSlide, 0))
  // Si la temática cambia en vivo (constructor) y quedan menos slides, no salirse del rango.
  const current = Math.min(selected, count - 1)
  const phoneRef = useRef<HTMLDivElement>(null)

  const change = useCallback(
    (next: number) => {
      setCurrent(next)
      onSlideChange?.(next)
    },
    [onSlideChange],
  )

  const { dragging, offset, go } = useSwipe(phoneRef, { index: current, count, onChange: change })

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

  const paletteStyle = {
    '--bx-primary': config.palette.primary,
    '--bx-ink': config.palette.ink,
    '--bx-accent': config.palette.accent,
  } as CSSProperties

  return (
    <div
      className={`bx-player bx-overlay ${variant === 'embedded' ? 'bx-embedded' : ''}`}
      style={paletteStyle}
    >
      <div
        ref={phoneRef}
        className="bx-phone"
        tabIndex={0}
        role="region"
        aria-roledescription="presentación"
        aria-label={`Boxie para ${data.recipientName || 'vos'}`}
      >
        <div className="bx-progress" aria-hidden>
          {config.slides.map((s, i) => (
            <div
              key={s.key}
              className={`bx-progress-segment ${i === current ? 'is-active' : ''}`}
            />
          ))}
        </div>

        {preview && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="bx-close"
            aria-label="Cerrar vista previa"
          >
            <X size={20} />
          </button>
        )}

        <div className="bx-nav-hint">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={current === 0}
            aria-label="Slide anterior"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={current === count - 1}
            aria-label="Slide siguiente"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {config.slides.map((slide, index) => {
          if (Math.abs(index - current) > 1) return null
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
              key={slide.key}
              slide={slide}
              index={index}
              current={current}
              dragging={dragging}
              offset={offset}
            >
              <SlideBody slide={slide} buyer={data.content[slide.key]} ctx={ctx} />
            </SlideFrame>
          )
        })}
      </div>
    </div>
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

function SlideFrame({
  slide,
  index,
  current,
  dragging,
  offset,
  children,
}: {
  slide: ParsedSlide
  index: number
  current: number
  dragging: boolean
  offset: number
  children: ReactNode
}) {
  const { frame } = slide
  const active = index === current
  const base = (index - current) * 100
  const scale = dragging && active ? 1 - Math.abs(offset) / 2000 : 1
  return (
    <section
      className={`bx-slide ${BACKGROUND_CLASS[frame.background] ?? ''} ${active ? 'is-active' : ''}`}
      aria-hidden={!active}
      style={{
        transform: `translateY(calc(${base}% + ${dragging ? offset : 0}px)) scale(${scale})`,
        transition: dragging ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: active ? 10 : 0,
        borderRadius: dragging ? '30px' : frame.fullScreen ? '0px' : '30px',
        padding: frame.fullScreen ? '0px' : '20px',
        overflow: 'hidden',
      }}
    >
      {frame.particles !== 'none' && <FloatingParticles type={frame.particles} seed={index + 1} />}
      {frame.confetti && <ConfettiLayer seed={index + 11} />}
      <div className="bx-slide-content">{children}</div>
    </section>
  )
}
