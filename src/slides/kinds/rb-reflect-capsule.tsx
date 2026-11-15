import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Stars } from '../ribbly/art'
import { Btn, Chip, slideOfKind, Stage, T, u, useStored } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { ease, frames, Loop, spring } from './motion'
import type { Props } from './shared'

const SLIPS = ['#FF8FB1', '#B28DFF', '#FFD35C', '#4FC3F7', '#5ED6A8', '#FFFFFF', '#F2A93B']

/** Frasco de vidrio con tapa dorada y papelitos adentro. */
function Jar({ slips }: { slips: number }) {
  const papers = [
    [58, 196, -12],
    [92, 204, 8],
    [74, 178, 22],
    [112, 186, -18],
    [50, 168, 30],
    [100, 162, -6],
    [78, 150, 14],
  ] as const
  return (
    <svg
      viewBox="0 0 180 240"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="rb-jar-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id="rb-jar-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE08F" />
          <stop offset="1" stopColor="#F2A93B" />
        </linearGradient>
      </defs>
      <rect
        x="22"
        y="40"
        width="136"
        height="188"
        rx="26"
        fill="url(#rb-jar-glass)"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="2.5"
      />
      {papers.slice(0, Math.max(slips, 3)).map(([x, y, angle], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="30"
          height="17"
          rx="3"
          fill={SLIPS[i % SLIPS.length]}
          transform={`rotate(${angle} ${x + 15} ${y + 8})`}
        />
      ))}
      <rect x="34" y="58" width="12" height="120" rx="6" fill="#fff" opacity="0.32" />
      <rect x="32" y="14" width="116" height="32" rx="9" fill="url(#rb-jar-lid)" />
      <rect x="32" y="34" width="116" height="6" fill="rgba(160,100,20,0.25)" />
    </svg>
  )
}

/**
 * 16 · Cápsula del tiempo: una carta para su yo del futuro. La escribe quien
 * recibe y queda guardada en su dispositivo, dentro del frasco.
 */
export function ReflectCapsule({ theme, ctx }: Props<'reflect.capsule'>) {
  const active = ctx.active
  const [letter, setLetter] = useStored(ctx, 'carta', '')
  const wishesKey = slideOfKind(ctx, theme.wishesFromKind)
  const [wishes] = useStored<string[]>(ctx, 'deseos', [], wishesKey ?? ctx.slideKey)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  if (!active && open) setOpen(false)

  const hasAge = !!ctx.vars.edad
  const begin = () => {
    setDraft(letter)
    setJustSaved(false)
    setOpen(true)
  }
  const save = () => {
    setLetter(draft.trim())
    setOpen(false)
    setJustSaved(!!draft.trim())
  }

  return (
    <Stage bg="linear-gradient(180deg, #1E3A8A 0%, #6B4FBF 45%, #C97FD4 100%)">
      <div className="rb-bg">
        <Stars seed={16} count={30} sparks={5} area={72} />
        <i className="rb-planet" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.div
            key="frasco"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <div style={{ alignSelf: 'stretch', textAlign: 'left', marginTop: u(8) }}>
              <p className="rb-kicker" style={{ color: 'var(--rb-sol)' }}>
                <T text={theme.kicker} ctx={ctx} />
              </p>
              <h2
                className="rb-playfair"
                style={{
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: u(32),
                  lineHeight: 1.08,
                  marginTop: u(10),
                }}
              >
                <T text={theme.title1} ctx={ctx} />
                <br />
                <T text={theme.title2} ctx={ctx} />
              </h2>
              <p
                className="rb-sub"
                style={{ fontSize: u(13.5), marginTop: u(10), textWrap: 'pretty' }}
              >
                <T text={hasAge ? theme.subtitle : theme.subtitleNoAge} ctx={ctx} />
              </p>
            </div>

            <div className="rb-grow">
              <Loop
                active={active}
                duration={5}
                frames={frames.float(10, 1.2)}
                style={{ position: 'relative', width: u(150) }}
              >
                <motion.div
                  initial={false}
                  animate={
                    justSaved ? { scale: [1, 1.1, 0.97, 1], rotate: [0, -4, 3, 0] } : { scale: 1 }
                  }
                  transition={{ duration: 0.7, delay: 0.1 }}
                >
                  <Jar slips={wishes.length + (letter ? 4 : 2)} />
                </motion.div>
                {hasAge && (
                  <span className="rb-jar-tag">
                    <T text={theme.jarLabel} ctx={ctx} />
                  </span>
                )}
              </Loop>
              {justSaved && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { ...spring.pop, delay: 0.3 },
                  }}
                  style={{ marginTop: u(14) }}
                >
                  <Chip mods="is-glass">
                    <T text={theme.savedLabel} ctx={ctx} />
                  </Chip>
                </motion.div>
              )}
            </div>

            <div className="rb-actions">
              <Btn variant="white" onClick={begin} style={{ fontSize: u(15) }}>
                <T text={letter ? theme.editLabel : theme.cta} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="carta"
            className="rb-body"
            style={{ paddingTop: u(66) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            {/* Al guardar, la hoja se achica hacia el frasco. */}
            <motion.div
              className="rb-paper"
              initial={{ y: 60, rotate: 3, opacity: 0 }}
              animate={{ y: 0, rotate: -1.5, opacity: 1, transition: spring.bouncy }}
              exit={{
                y: 160,
                scale: 0.12,
                rotate: 24,
                opacity: 0,
                transition: { duration: 0.45, ease: ease.inOut },
              }}
            >
              <label
                htmlFor={`carta-${ctx.slideKey}`}
                className="rb-caveat"
                style={{ fontWeight: 700, fontSize: u(23), color: 'var(--rb-cielo-p)' }}
              >
                <T
                  text={hasAge ? theme.greeting : `${ctx.vars.querida} ${ctx.vars.nombre}:`}
                  ctx={ctx}
                />
              </label>
              <textarea
                id={`carta-${ctx.slideKey}`}
                className="rb-input rb-paper-text rb-scroll"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={600}
                placeholder={fill(theme.placeholder, ctx.vars)}
                autoFocus={!ctx.preview}
              />
            </motion.div>

            <div style={{ alignSelf: 'flex-start', marginTop: u(16) }}>
              <Chip mods="is-glass" style={{ fontSize: u(12) }}>
                <T
                  text={ctx.vars.fecha_proximo_cumple ? theme.lockChip : theme.lockChipNoDate}
                  ctx={ctx}
                />
              </Chip>
            </div>

            <div
              className="rb-actions is-row"
              style={{ marginTop: u(16), padding: `0 ${u(30)} 0 0` }}
            >
              <Btn variant="glass" onClick={() => setOpen(false)} style={{ fontSize: u(15) }}>
                <T text={theme.closeLabel} ctx={ctx} />
              </Btn>
              <Btn variant="yellow" onClick={save} style={{ fontSize: u(15) }}>
                <T text={theme.saveLabel} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
