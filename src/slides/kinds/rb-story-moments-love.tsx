import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { SCENES_PAREJA } from '../ribbly/art'
import {
  MOMENTS_BG,
  MOMENTS_DOODLES,
  MOMENTS_WAVES,
  POLAROID,
  polaroidSpots,
  splitAccent,
  STORY_H,
  STORY_W,
} from '../ribbly/love-art'
import { HeartIcon, Waves, Wordmark } from '../ribbly/love'
import { drawMomentsImage } from '../ribbly/story-image'
import { StoryShare } from '../ribbly/StoryShare'
import { Stage, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, Pop, spring } from './motion'
import type { Props } from './shared'

const px = (x: number) => `${(x / STORY_W) * 100}%`
const py = (y: number) => `${(y / STORY_H) * 100}%`

interface Moment {
  src?: string
  scene: number
  caption: string
}

/**
 * 05 · Fotos (Pareja): cuatro polaroids fijas en una grilla de 2 × 2, pegadas
 * con cinta washi sobre un fondo rosa con ondas, la frase en una píldora y el
 * contador de días juntos. Es 9:16: se comparte como historia de Instagram.
 * Un toque en una foto la agranda; ahí se pueden recorrer todas.
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
    : // Sin fotos todavía: cuatro escenas de ejemplo para ver cómo queda.
      [0, 1, 2, 3].map((i) => ({
        scene: i % SCENES_PAREJA.length,
        caption: i === 1 ? fill(theme.defaultCaption, ctx.vars) : '',
      }))

  const shown = moments.slice(0, 4)
  const extra = moments.length - shown.length
  const spots = polaroidSpots(shown.length)
  const [zoom, setZoom] = useState<number | null>(null)

  const kicker = fill(theme.kicker, ctx.vars)
  const title = fill(theme.title, ctx.vars)
  const phrase = fill(theme.phrase, ctx.vars)
  const days = ctx.vars.dias_juntos ? fill(theme.daysLabel, ctx.vars) : ''
  const [titlePlain, titleAccent] = splitAccent(title, 1)
  const [phrasePlain, phraseAccent] = splitAccent(phrase, 2)

  const picture = (m: Moment) => {
    const Scene = SCENES_PAREJA[m.scene]!
    return m.src ? <img src={m.src} alt={m.caption || 'Recuerdo'} draggable={false} /> : <Scene />
  }

  const step = (by: number) =>
    setZoom((z) => (z === null ? z : (z + by + moments.length) % moments.length))
  const current = zoom === null ? null : moments[zoom]

  return (
    <Stage
      bg={`linear-gradient(180deg, ${MOMENTS_BG[0]} 0%, ${MOMENTS_BG[1]} 55%, ${MOMENTS_BG[2]} 100%)`}
      className="rb-lm"
    >
      <div className="rb-bg">
        <Waves waves={MOMENTS_WAVES} />
        {MOMENTS_DOODLES.hearts.map((h, i) => (
          <HeartIcon
            key={i}
            stroke="#E8487E"
            strokeWidth={1.5}
            className="rb-lm-doodle"
            style={{
              left: px(h.x),
              top: py(h.y),
              width: u(h.size * 1.15),
              transform: `translate(-50%, -50%) rotate(${h.rotate}deg)`,
            }}
          />
        ))}
        {MOMENTS_DOODLES.dashes.map((d, i) => (
          <svg
            key={i}
            viewBox="-2 -17 15 31"
            className="rb-lm-doodle"
            style={{
              left: px(d.x),
              top: py(d.y),
              width: u(15),
              transform: `translate(${d.flip ? '-100%' : '0'}, -50%) scaleX(${d.flip ? -1 : 1})`,
            }}
            aria-hidden
          >
            <path
              d="M0 -8L4 -15M2 0L11 -3M0 8L8 12"
              stroke="#231F26"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        ))}
      </div>

      <div className="rb-body rb-lm-body">
        <Appear active={active} y={-10} className="rb-lm-logo">
          <Wordmark color="#E43672" />
        </Appear>
        <Appear as="p" active={active} delay={0.08} className="rb-lm-kicker">
          <i aria-hidden />
          <span>
            <EmojiText text={kicker} />
          </span>
          <i aria-hidden />
        </Appear>
        <Appear as="h2" active={active} delay={0.16} className="rb-lm-title">
          {titlePlain && (
            <>
              <EmojiText text={titlePlain} />{' '}
            </>
          )}
          <span className="rb-lm-accent">
            <EmojiText text={titleAccent} />
          </span>
        </Appear>

        <div className="rb-lm-grid">
          {shown.map((m, i) => {
            const spot = spots[i]!
            return (
              // La posición y el giro van por fuera: la entrada (Pop) termina derecha.
              <div
                key={i}
                className="rb-lm-spot"
                style={{
                  left: px(spot.x),
                  top: `${((spot.y - 140) / (500 - 140)) * 100}%`,
                  width: px(POLAROID.w),
                  transform: `translate(-50%, -50%) rotate(${spot.rotate}deg)`,
                }}
              >
                <Pop active={active} delay={0.3 + i * 0.12} from={0.5} rotate={i % 2 ? 10 : -10}>
                  <motion.button
                    type="button"
                    className="rb-lm-polaroid"
                    onClick={() => setZoom(i)}
                    whileTap={{ scale: 0.96 }}
                    aria-label={`Ver la foto ${i + 1}${m.caption ? `: ${m.caption}` : ''}`}
                  >
                    <i className="rb-lm-tape" aria-hidden />
                    <span className="rb-lm-photo">
                      {picture(m)}
                      {i === shown.length - 1 && extra > 0 && (
                        <span className="rb-lm-more">+{extra}</span>
                      )}
                    </span>
                    <span className="rb-lm-foot">
                      <HeartIcon stroke="#231F26" strokeWidth={1.3} />
                      {m.caption && (
                        <span className="rb-lm-caption">
                          <EmojiText text={m.caption} />
                        </span>
                      )}
                    </span>
                  </motion.button>
                </Pop>
              </div>
            )
          })}
        </div>

        <Appear active={active} delay={0.85} y={16} className="rb-lm-pill">
          {phrasePlain && (
            <span className="rb-lm-pill-l1">
              <EmojiText text={phrasePlain} />
            </span>
          )}
          <span className="rb-lm-pill-l2">
            <EmojiText text={phraseAccent} />
          </span>
          <HeartIcon stroke="#231F26" strokeWidth={1.5} className="rb-lm-pill-heart" />
        </Appear>

        <div className="rb-lm-foot-row">
          {days ? (
            <Appear active={active} delay={1} y={10} className="rb-lm-days" aria-live="polite">
              <CalendarDays size={18} strokeWidth={1.6} aria-hidden />
              <i aria-hidden />
              <EmojiText text={days} />
            </Appear>
          ) : (
            <span />
          )}
          <Appear active={active} delay={1.1} y={10}>
            <StoryShare
              active={active}
              label={fill(theme.shareLabel, ctx.vars) || 'Compartir en Instagram'}
              fileName="ribbly-momentos.png"
              deps={[
                ...shown.map((m) => m.src ?? `escena-${m.scene}`),
                kicker,
                title,
                phrase,
                days,
              ].join('|')}
              draw={(fonts) =>
                drawMomentsImage(
                  { photos: shown.map((m) => m.src), kicker, title, phrase, days },
                  fonts,
                )
              }
            />
          </Appear>
        </div>
      </div>

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
