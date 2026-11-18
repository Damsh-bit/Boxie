import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { SCENES_PAREJA } from '../ribbly/art'
import { momentsScene } from '../ribbly/love-art'
import { SceneView, useSceneMeasure, type Entrance } from '../ribbly/scene-svg'
import { createMeasure, drawScene } from '../ribbly/story-image'
import { StoryShare } from '../ribbly/StoryShare'
import { Stage, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, spring } from './motion'
import type { Props } from './shared'

const ENTRANCES: Record<string, Entrance> = {
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
 * 05 · Fotos (Pareja): cuatro polaroids en una grilla de 2 × 2, pegadas con
 * cinta sobre un fondo rosa con ondas, la frase en un óvalo dibujado a mano y
 * el contador de días juntos. Calcada del diseño en 9:16: se comparte como
 * historia de Instagram. Un toque en una foto la agranda; ahí se pueden
 * recorrer todas.
 */
export function StoryMomentsLove({ theme, buyer, ctx }: Props<'story.moments'>) {
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

  const data = {
    photos: shown.map((m) => m.src),
    kicker: fill(theme.kicker, ctx.vars),
    title: fill(theme.title, ctx.vars),
    phrase: fill(theme.phrase, ctx.vars),
    days: ctx.vars.dias_juntos ? fill(theme.daysLabel, ctx.vars) : '',
  }
  const measure = useSceneMeasure()
  const scene = momentsScene(data, measure)

  const picture = (m: Moment) => {
    const Scene = SCENES_PAREJA[m.scene]!
    return m.src ? <img src={m.src} alt={m.caption || 'Recuerdo'} draggable={false} /> : <Scene />
  }
  const step = (by: number) =>
    setZoom((z) => (z === null ? z : (z + by + moments.length) % moments.length))
  const current = zoom === null ? null : moments[zoom]

  return (
    <Stage bg="#FCF1F5" className="rb-lm">
      <SceneView
        scene={scene}
        active={active}
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
            ...data.photos.map((p, i) => p ?? `vacia-${i}`),
            data.kicker,
            data.title,
            data.phrase,
            data.days,
          ].join('|')}
          draw={(families) => drawScene(momentsScene(data, createMeasure(families)), families)}
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
