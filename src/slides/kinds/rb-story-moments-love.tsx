import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { SCENES_PAREJA } from '../ribbly/art'
import { cumpleMomentsScene } from '../ribbly/cumple-art'
import { momentsScene } from '../ribbly/love-art'
import { SceneView, useSceneMeasure, type Entrance } from '../ribbly/scene-svg'
import { createMeasure, drawScene } from '../ribbly/story-image'
import { StoryShare } from '../ribbly/StoryShare'
import { Stage, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, spring } from './motion'
import type { Props } from './shared'

const ENTRANCES: Record<string, Entrance> = {
  balloons: { delay: 0.2, y: 40 },
  confetti: { delay: 0.6, scale: 0.8, pop: true },
  candle: { delay: 0.8, scale: 0.6, pop: true },
  logo: { y: -10 },
  kicker: { delay: 0.08, y: 10 },
  title: { delay: 0.16, y: 14 },
  doodles: { delay: 0.9, scale: 0.7, pop: true },
  'polaroid-0': { delay: 0.3, scale: 0.5, rotate: -10, pop: true },
  'polaroid-1': { delay: 0.42, scale: 0.5, rotate: 10, pop: true },
  'polaroid-2': { delay: 0.54, scale: 0.5, rotate: -10, pop: true },
  'polaroid-3': { delay: 0.66, scale: 0.5, rotate: 10, pop: true },
  phrase: { delay: 0.85, y: 16 },
  days: { delay: 1, y: 10 },
}

interface Moment {
  src?: string
  scene: number
  caption: string
}

/**
 * 05 · Fotos: cuatro polaroids en una grilla de 2 × 2, la frase en un óvalo y,
 * si hay fecha, el contador de días juntos. En Pareja van pegadas con cinta
 * sobre rosa; en Cumpleaños, con moños dorados y globos, en dos diseños
 * (celeste o crema). Calcadas del diseño en 9:16: se comparten como historia
 * de Instagram. Un toque en una foto la agranda; ahí se pueden recorrer todas.
 */
export function StoryMomentsGrid({ theme, buyer, ctx }: Props<'story.moments'>) {
  const active = ctx.active
  const loaded = buyer.moments.filter((m) => m.photo || m.caption.trim() || m.year.trim())
  const moments: Moment[] = loaded.length
    ? loaded.map((m, i) => ({
        src: ctx.resolveMedia(m.photo),
        scene: i % SCENES_PAREJA.length,
        caption: m.caption.trim() || m.year.trim(),
      }))
    : // Sin fotos todavía: cuatro lugares vacíos para ver cómo queda.
      [0, 1, 2, 3].map((i) => ({ scene: i % SCENES_PAREJA.length, caption: '' }))

  const shown = moments.slice(0, 4)
  const [zoom, setZoom] = useState<number | null>(null)

  const cumple = theme.look !== 'pareja'
  const data = {
    variant: buyer.variant,
    photos: shown.map((m) => m.src),
    kicker: fill(theme.kicker, ctx.vars),
    title: buyer.title.trim() || fill(theme.title, ctx.vars),
    phrase: buyer.phrase.trim() || fill(theme.phrase, ctx.vars),
    days: ctx.vars.dias_juntos ? fill(theme.daysLabel, ctx.vars) : '',
  }
  const build = cumple ? cumpleMomentsScene : momentsScene
  const measure = useSceneMeasure()
  const scene = build(data, measure)

  const picture = (m: Moment) => {
    const Scene = SCENES_PAREJA[m.scene]!
    return m.src ? <img src={m.src} alt={m.caption || 'Recuerdo'} draggable={false} /> : <Scene />
  }
  const step = (by: number) =>
    setZoom((z) => (z === null ? z : (z + by + moments.length) % moments.length))
  const current = zoom === null ? null : moments[zoom]

  return (
    <Stage
      bg={cumple ? (data.variant === 'crema' ? '#F8F2E6' : '#E6F4FB') : '#FCF1F5'}
      className="rb-lm"
    >
      <SceneView
        scene={scene}
        active={active}
        editing={ctx.editing}
        entrances={ENTRANCES}
        onTap={(id) => setZoom(Number(id.replace('polaroid-', '')))}
        label={[data.kicker, data.title, data.phrase, data.days].filter(Boolean).join('. ')}
      />

      <Appear active={active} delay={1.1} y={10} className="rb-lm-share">
        <StoryShare
          active={active}
          label={fill(theme.shareLabel, ctx.vars) || 'Compartir en Instagram'}
          fileName="ribbly-momentos.png"
          deps={[
            data.variant,
            ...data.photos.map((p, i) => p ?? `vacia-${i}`),
            data.kicker,
            data.title,
            data.phrase,
            data.days,
          ].join('|')}
          draw={(families) => drawScene(build(data, createMeasure(families)), families)}
        />
      </Appear>
      {moments.length > shown.length && (
        <button
          type="button"
          className="rb-lm-more"
          onClick={() => setZoom(shown.length)}
          aria-label={`Ver las ${moments.length} fotos`}
        >
          +{moments.length - shown.length} fotos
        </button>
      )}

      <AnimatePresence>
        {current && (
          <motion.div
            className="rb-zoom"
            onClick={() => setZoom(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <motion.div
              key={zoom}
              initial={{ scale: 0.7, rotate: -6 }}
              animate={{ scale: 1, rotate: -1, transition: spring.bouncy }}
              exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.18 } }}
            >
              <div className="rb-polaroid-photo">{picture(current)}</div>
              <p className="rb-polaroid-caption" style={{ fontSize: u(24), whiteSpace: 'normal' }}>
                <EmojiText text={current.caption || `${(zoom ?? 0) + 1} de ${moments.length}`} />
              </p>
            </motion.div>
            {moments.length > 1 && (
              <div className="rb-lm-zoom-nav">
                <button
                  type="button"
                  aria-label="Foto anterior"
                  onClick={(e) => {
                    e.stopPropagation()
                    step(-1)
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <span>
                  {(zoom ?? 0) + 1} / {moments.length}
                </span>
                <button
                  type="button"
                  aria-label="Foto siguiente"
                  onClick={(e) => {
                    e.stopPropagation()
                    step(1)
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
