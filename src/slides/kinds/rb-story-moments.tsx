import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { Bokeh, SCENES, SCENES_PAREJA, StringLights } from '../ribbly/art'
import { Stage, T, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, spring } from './motion'
import type { Props } from './shared'

interface Moment {
  src?: string
  scene: number
  year: string
  caption: string
}

/**
 * 05 · Recorrido: las fotos de quien regala como polaroids colgadas con
 * broches. Se pasan arrastrando hacia los costados o tocando el año; un toque
 * en la del frente la agranda.
 */
export function StoryMoments({ theme, buyer, ctx }: Props<'story.moments'>) {
  const active = ctx.active
  const pareja = theme.look === 'pareja'
  const scenes = pareja ? SCENES_PAREJA : SCENES
  const year = Number(ctx.vars.anio)
  const loaded = buyer.moments.filter((m) => m.photo || m.caption.trim() || m.year.trim())
  const moments: Moment[] = loaded.length
    ? loaded.map((m, i) => ({
        src: ctx.resolveMedia(m.photo),
        scene: i % scenes.length,
        year: m.year.trim(),
        caption: m.caption.trim(),
      }))
    : // Sin fotos todavía: tres escenas de ejemplo para ver cómo queda.
      [year - 9, year - 5, year - 1].map((y, i) => ({
        scene: i,
        year: String(y),
        caption: i === 2 ? fill(theme.defaultCaption, ctx.vars) : '',
      }))

  const count = moments.length
  const [selected, setSelected] = useState(count - 1)
  const [zoom, setZoom] = useState(false)
  const index = Math.min(selected, count - 1)
  const go = (next: number) => setSelected(Math.max(0, Math.min(count - 1, next)))
  const current = moments[index]!
  const counter = fill(
    index === count - 1 && count > 1 ? theme.lastCounter : theme.counter,
    ctx.vars,
    {
      n: String(index + 1),
      total: String(count),
    },
  )

  const picture = (m: Moment) => {
    const Scene = scenes[m.scene]!
    return m.src ? <img src={m.src} alt={m.caption || 'Recuerdo'} draggable={false} /> : <Scene />
  }

  return (
    <Stage
      bg={pareja ? '#2A2433' : 'linear-gradient(180deg, #FFB45C 0%, #FF8A7A 45%, #F77A9D 100%)'}
      className={pareja ? 'is-pareja' : ''}
    >
      {pareja && (
        // Pareja: la foto de adelante, fuera de foco, tiñe el fondo.
        <div className="rb-bg">
          <div className="rb-photo-bg" style={{ opacity: 0.55 }}>
            {picture(current)}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(42,36,51,0.55), rgba(42,36,51,0.75))',
            }}
          />
          <Bokeh seed={55} count={10} colors={['#FFC56E', '#FFD9A0']} blur={8} maxOpacity={0.35} />
        </div>
      )}
      <div className="rb-body">
        <Appear as="p" active={active} y={10} className="rb-kicker" style={{ marginTop: u(4) }}>
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Appear
          as="h2"
          active={active}
          delay={0.1}
          className="rb-title rb-shadow-text"
          style={{ fontSize: u(27), marginTop: u(5) }}
        >
          <T text={theme.title} ctx={ctx} />
        </Appear>

        <div className="rb-deck" style={{ marginTop: u(26) }}>
          {pareja ? (
            <StringLights
              style={{
                position: 'absolute',
                left: '-6%',
                width: '112%',
                top: u(-4),
                height: u(54),
              }}
            />
          ) : (
            <svg
              className="rb-deck-line"
              viewBox="0 0 400 46"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0 4 Q200 44 400 4"
                fill="none"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1.6"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          {moments.map((m, i) => {
            const offset = i - index
            const near = Math.abs(offset) <= 2
            const front = offset === 0
            return (
              <motion.div
                key={i}
                className="rb-polaroid"
                style={{ zIndex: 10 - Math.abs(offset), pointerEvents: near ? 'auto' : 'none' }}
                initial={false}
                animate={{
                  x: `${offset * 62}%`,
                  y: front ? 0 : `calc(var(--u) * ${-8 + Math.abs(offset) * 4})`,
                  rotate: front ? -1.5 : offset * 7,
                  scale: front ? 1 : 0.78,
                  opacity: !active ? 0 : near ? (front ? 1 : 0.92) : 0,
                }}
                transition={{ ...spring.soft, delay: active ? 0 : 0 }}
                drag={front && count > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50 || info.velocity.x < -400) go(index + 1)
                  else if (info.offset.x > 50 || info.velocity.x > 400) go(index - 1)
                }}
                onTap={() => (front ? setZoom(true) : go(i))}
                whileTap={front ? { scale: 0.97 } : undefined}
              >
                <i className="rb-pin" style={{ left: '46%' }} aria-hidden />
                <div className="rb-polaroid-photo">{picture(m)}</div>
                <p className="rb-polaroid-caption">
                  <EmojiText text={m.caption || m.year} />
                </p>
              </motion.div>
            )
          })}
        </div>

        <Appear active={active} delay={0.5} className="rb-years" style={{ marginTop: u(12) }}>
          {moments.map((m, i) => (
            <button
              key={i}
              type="button"
              className={`rb-year ${i === index ? 'is-on' : ''}`}
              onClick={() => go(i)}
              aria-label={`Ver el momento ${i + 1}${m.year ? ` (${m.year})` : ''}`}
              aria-pressed={i === index}
            >
              {m.year || i + 1}
            </button>
          ))}
        </Appear>

        <Appear
          as="p"
          active={active}
          delay={0.6}
          className="rb-hand rb-shadow-text"
          style={{ fontSize: u(27), marginTop: u(18), maxWidth: u(262) }}
        >
          <T text={theme.phrase} ctx={ctx} />
        </Appear>
        <Appear
          as="p"
          active={active}
          delay={0.7}
          style={{ fontSize: u(12), fontWeight: 500, margin: `${u(14)} ${u(34)} ${u(10)}` }}
          aria-live="polite"
        >
          {counter}
        </Appear>
      </div>

      <AnimatePresence>
        {zoom && (
          <motion.div
            className="rb-zoom"
            onClick={() => setZoom(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -6 }}
              animate={{ scale: 1, rotate: -1, transition: spring.bouncy }}
              exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.18 } }}
            >
              <div className="rb-polaroid-photo">{picture(current)}</div>
              <p className="rb-polaroid-caption" style={{ fontSize: u(24), whiteSpace: 'normal' }}>
                <EmojiText text={current.caption || current.year} />
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
