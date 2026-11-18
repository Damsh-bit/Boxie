import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Stars } from '../ribbly/art'
import { useRbPalette } from '../ribbly/look'
import { Btn, Chip, editable, slideOfKind, Stage, T, u, useStored } from '../ribbly/ui'
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

/** Cofre del tesoro, entreabierto, con papelitos y brillo adentro. */
function Chest({ slips }: { slips: number }) {
  return (
    <svg
      viewBox="0 0 180 240"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="rb-chest-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B5743F" />
          <stop offset="1" stopColor="#7A4523" />
        </linearGradient>
        <radialGradient id="rb-chest-glow" cx="50%" cy="100%" r="80%">
          <stop offset="0" stopColor="#FFF3B0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFD35C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="90" cy="118" rx="86" ry="52" fill="url(#rb-chest-glow)" />
      {/* Tapa abierta hacia atrás */}
      <path
        d="M20 112 C20 60 160 60 160 112 L150 104 C146 74 34 74 30 104 Z"
        fill="url(#rb-chest-wood)"
      />
      <path d="M86 70 h8 v38 h-8 Z" fill="#F2C14E" />
      {Array.from({ length: Math.min(Math.max(slips, 3), 7) }, (_, i) => (
        <rect
          key={i}
          x={40 + i * 15}
          y={104 - (i % 3) * 6}
          width="26"
          height="15"
          rx="3"
          fill={SLIPS[i % SLIPS.length]}
          transform={`rotate(${(i % 2 ? 1 : -1) * (8 + i * 3)} ${53 + i * 15} ${110})`}
        />
      ))}
      {/* Caja */}
      <rect x="18" y="112" width="144" height="106" rx="10" fill="url(#rb-chest-wood)" />
      <path d="M18 140 h144 M18 190 h144" stroke="rgba(0,0,0,0.18)" strokeWidth="3" />
      <rect x="18" y="112" width="144" height="10" fill="#F2C14E" />
      <rect x="18" y="208" width="144" height="10" rx="4" fill="#F2C14E" />
      <rect x="26" y="112" width="10" height="106" fill="#F2C14E" />
      <rect x="144" y="112" width="10" height="106" fill="#F2C14E" />
      <rect x="76" y="132" width="28" height="34" rx="5" fill="#F2C14E" />
      <circle cx="90" cy="146" r="5" fill="#7A4523" />
      <path d="M90 150 v8" stroke="#7A4523" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** Caja de regalo con moño. */
function GiftBox({ color, ribbon }: { color: string; ribbon: string }) {
  return (
    <svg
      viewBox="0 0 180 240"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <path d="M90 66 C70 34 40 40 48 60 C54 74 80 70 90 66 Z" fill={ribbon} />
      <path d="M90 66 C110 34 140 40 132 60 C126 74 100 70 90 66 Z" fill={ribbon} />
      <rect x="22" y="70" width="136" height="38" rx="6" fill={color} />
      <rect x="30" y="104" width="120" height="118" rx="6" fill={color} />
      <rect x="30" y="104" width="120" height="14" fill="rgba(0,0,0,0.15)" />
      <rect x="80" y="70" width="20" height="152" fill={ribbon} />
      <circle cx="90" cy="68" r="9" fill={ribbon} />
      <rect x="120" y="118" width="22" height="100" fill="rgba(255,255,255,0.14)" />
    </svg>
  )
}

/** Sobre cerrado con sello de lacre. */
function SealedLetter({ color, wax }: { color: string; wax: string }) {
  return (
    <svg
      viewBox="0 0 180 240"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <g transform="rotate(-6 90 140)">
        <rect x="8" y="78" width="164" height="118" rx="8" fill={color} />
        <path d="M8 86 L90 148 L172 86" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2.5" />
        <path d="M8 196 L70 136 M172 196 L110 136" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
        <circle cx="90" cy="146" r="22" fill={wax} />
        <circle
          cx="90"
          cy="146"
          r="15"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
        />
        <path
          d="M90 156 C80 149 76 143 80 138 C83 135 88 136 90 140 C92 136 97 135 100 138 C104 143 100 149 90 156 Z"
          fill="rgba(255,255,255,0.55)"
        />
        <path d="M66 168 l-6 22 l12 -8 l8 12 l4 -24 Z" fill={wax} opacity="0.9" />
      </g>
    </svg>
  )
}

/** El recipiente de la cápsula (eje `recipiente`). */
function Vessel({ kind, slips }: { kind?: string; slips: number }) {
  const palette = useRbPalette()
  if (kind === 'cofre') return <Chest slips={slips} />
  if (kind === 'caja')
    return <GiftBox color={palette?.primary ?? '#F44E63'} ribbon={palette?.accent ?? '#FFD35C'} />
  if (kind === 'sobre')
    return (
      <SealedLetter color={palette?.cream ?? '#FFF4DE'} wax={palette?.primaryDeep ?? '#B8233F'} />
    )
  return <Jar slips={slips} />
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
    <Stage tone="deep" bg="linear-gradient(180deg, #1E3A8A 0%, #6B4FBF 45%, #C97FD4 100%)">
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
                  {...editable(ctx, '', 'recipiente')}
                  initial={false}
                  animate={
                    justSaved ? { scale: [1, 1.1, 0.97, 1], rotate: [0, -4, 3, 0] } : { scale: 1 }
                  }
                  transition={{ duration: 0.7, delay: 0.1 }}
                >
                  <Vessel kind={ctx.style.recipiente} slips={wishes.length + (letter ? 4 : 2)} />
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
