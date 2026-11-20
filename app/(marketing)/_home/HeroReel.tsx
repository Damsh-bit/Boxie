'use client'

import { useCallback, type CSSProperties } from 'react'
import type { BuyerPhoto } from '@/slides/fields'
import { ConfettiLayer, FloatingParticles, GradientDrift } from '@/slides/player/effects'
import { BACKGROUND_CLASS, SlideBody } from '@/slides/player/Player'
import { STORY_W } from '@/slides/ribbly/love-art'
import type { ShowcaseSlide, ShowcaseTheme } from '@/slides/showcase'
import { SlideStyleContext } from '@/slides/style-context'
import type { SlideContext } from '@/slides/types'
import './hero-reel.css'

/**
 * Una pantalla de verdad (el mismo componente del regalo) dentro del celular
 * de la portada. Se dibuja al tamaño del regalo (STORY_W de ancho) y se
 * achica entera al del celular: las pantallas nuevas se miden solas (--u) y
 * las anteriores, que van en píxeles, quedan como en el regalo.
 *
 * Va en su propio archivo para cargarse aparte (next/dynamic): el registro de
 * pantallas y sus estilos no pesan en la carga de la portada.
 */
export function HeroReel({
  theme,
  item,
  order,
  canvas,
  name,
  active,
  onNext,
  onRestart,
}: {
  theme: ShowcaseTheme
  item: ShowcaseSlide
  /** Su lugar en la vidriera (para las semillas de los adornos). */
  order: number
  /** El ancho (px) del lienzo del celular, antes de su propia escala. */
  canvas: number
  /** El nombre que escribieron en el armador o el de ejemplo. */
  name: string
  /** Se ve: arrancan sus animaciones (afuera de la pantalla, quietas). */
  active: boolean
  onNext(): void
  onRestart(): void
}) {
  const { slide, content } = item
  const { frame } = slide

  const resolveMedia = useCallback(
    (ref: BuyerPhoto | string | null | undefined) => {
      if (!ref) return undefined
      if (typeof ref === 'string') return ref || undefined
      return theme.media[ref.assetId]
    },
    [theme.media],
  )

  const ctx: SlideContext = {
    recipientName: name,
    senderName: theme.senderName,
    palette: theme.palette,
    active,
    // Como en la vista previa: no guarda nada ni toma el foco.
    preview: true,
    resolveMedia,
    buyerContent: (key) => (key === slide.key ? content : undefined),
    summaries: [],
    goTo: onRestart,
    logoUrl: '/brand/ribbly-logo.png',
    slideKey: slide.key,
    index: order,
    slides: [{ key: slide.key, kind: slide.kind }],
    next: onNext,
    vars: { ...theme.vars, nombre: name },
    style: item.style,
  }

  const scale = canvas / STORY_W
  const style = {
    '--bx-primary': theme.palette.primary,
    '--bx-ink': theme.palette.ink,
    '--bx-accent': theme.palette.accent,
    width: STORY_W,
    height: `calc(100% / ${scale})`,
    transform: `scale(${scale})`,
  } as CSSProperties

  return (
    <div
      className="bx-player hero-reel absolute top-0 left-0 origin-top-left"
      style={style}
      data-hero-reel=""
      data-reel-item={item.id}
    >
      <section
        className={`bx-slide ${BACKGROUND_CLASS[frame.background] ?? ''} ${active ? 'is-active' : ''}`}
        style={{ padding: frame.fullScreen ? 0 : 20, boxShadow: 'none' }}
      >
        {frame.background === 'intro' && (
          <GradientDrift colors={['#fdfbfb', '#ffe4e6', '#fdf2f3', '#ffe4e6']} />
        )}
        {frame.particles !== 'none' && (
          <FloatingParticles type={frame.particles} seed={order + 1} active={active} />
        )}
        {frame.confetti && <ConfettiLayer seed={order + 11} active={active} />}
        <div className="bx-slide-content">
          <SlideStyleContext.Provider value={item.style}>
            <SlideBody slide={slide} buyer={content} ctx={ctx} />
          </SlideStyleContext.Provider>
        </div>
      </section>
    </div>
  )
}
