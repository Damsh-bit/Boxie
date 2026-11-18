import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, Play } from 'lucide-react'
import { useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { Balloon, CityNightScene, Confetti, Rays, Stars } from '../ribbly/art'
import { useRbPalette } from '../ribbly/look'
import { Btn, editable, Stage, T, u } from '../ribbly/ui'
import { Appear, ease } from './motion'
import type { Props } from './shared'

/** Cada recomendación tiene su clima: cambia el color del póster. */
const MOODS = [
  'linear-gradient(180deg, #FFE07A 0%, #FFAE4A 55%, #F2843B 100%)',
  'linear-gradient(180deg, #8FD8F8 0%, #6FA8F0 55%, #7B6BE0 100%)',
  'linear-gradient(180deg, #FFB0C8 0%, #F77A9D 55%, #C2478E 100%)',
  'linear-gradient(180deg, #A8F0D0 0%, #5ED6A8 55%, #2E9E8E 100%)',
]

const HATS = ['#F44E63', '#4FC3F7', '#5ED6A8', '#B28DFF', '#FFD35C']

/** Gente festejando, a contraluz. */
function Crowd() {
  const people = [
    [52, 150, 30],
    [128, 132, -18],
    [200, 140, 16],
    [270, 128, -28],
    [336, 150, 24],
  ] as const
  return (
    <svg
      className="rb-crowd"
      viewBox="0 0 390 300"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      {people.map(([x, y, arm], i) => (
        <g key={i} fill="#1B1640">
          <circle cx={x} cy={y - 30} r="24" />
          <path d={`M${x - 32} 300 V${y + 22} a32 32 0 0 1 64 0 V300 Z`} />
          <path
            d={`M${x - 26} ${y + 14} l${-arm} -84 l12 -3 l${arm + 6} 80 Z`}
            transform={`rotate(${arm > 0 ? -6 : 6} ${x} ${y})`}
          />
          <path
            d={`M${x + 26} ${y + 14} l${arm} -84 l-12 -3 l${-arm - 6} 80 Z`}
            transform={`rotate(${arm > 0 ? 6 : -6} ${x} ${y})`}
          />
          <path
            d={`M${x - 14} ${y - 48} L${x + 2} ${y - 92} L${x + 16} ${y - 46} Z`}
            fill={HATS[i % HATS.length]}
          />
        </g>
      ))}
    </svg>
  )
}

/** Filas de butacas de cine, a contraluz. */
function Seats() {
  return (
    <svg
      className="rb-crowd"
      viewBox="0 0 390 300"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      {[0, 1].map((row) => (
        <g key={row} fill={row ? '#120E2E' : '#1B1640'}>
          {Array.from({ length: 7 }, (_, i) => {
            const w = row ? 58 : 50
            const x = -10 + i * (w + 6) + (row ? -18 : 6)
            const y = row ? 214 : 176
            return (
              <path
                key={i}
                d={`M${x} 300 V${y + 18} q0 -18 18 -18 h${w - 36} q18 0 18 18 V300 Z`}
              />
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/** La escena de abajo del póster (eje `escena`). */
function PosterScene({ kind }: { kind?: string }) {
  if (kind === 'ciudad') return <CityNightScene />
  if (kind === 'butacas') return <Seats />
  if (kind === 'cielo') return <Stars seed={12} count={30} sparks={4} area={70} />
  return <Crowd />
}

/**
 * 10 · Recomendado para vos: un póster a pantalla completa por recomendación,
 * con solapas por plataforma. "Siguiente" pasa a la próxima; en la última,
 * sigue el regalo.
 */
export function MediaPoster({ theme, buyer, ctx }: Props<'media.poster'>) {
  const mine = buyer.picks.filter((p) => p.title.trim())
  const picks = mine.length ? mine : theme.suggestions.filter((p) => p.title.trim())
  const platforms = [...new Set(picks.map((p) => p.platform.trim()).filter(Boolean))]
  const [selected, setSelected] = useState(0)
  const index = Math.min(selected, Math.max(picks.length - 1, 0))
  const pick = picks[index]
  const last = index >= picks.length - 1
  const pareja = theme.look === 'pareja'
  const palette = useRbPalette()

  if (!pick) return <Stage bg={MOODS[0]}>{null}</Stage>

  if (pareja) {
    // Pareja: una noche de ciudad con luna llena, la misma para todas.
    return (
      <Stage bg="#2A1430" className="is-pareja">
        <div className="rb-bg">
          <CityNightScene />
          <Stars seed={10} count={22} sparks={2} area={36} />
          <div className="rb-poster-shade" />
        </div>
        <PosterBody
          theme={theme}
          ctx={ctx}
          pick={pick}
          picks={picks}
          index={index}
          last={last}
          platforms={platforms}
          setSelected={setSelected}
          kickerColor="#FFCCD5"
        />
      </Stage>
    )
  }

  // Con otra paleta, un solo clima: el de la paleta.
  const moods = palette ? [palette.vivid] : MOODS
  const balloons = palette
    ? [palette.balloons[1], palette.accent, palette.primary, palette.balloons[2]]
    : ['#4FC3F7', '#B28DFF', '#F44E63', '#5ED6A8']

  return (
    <Stage bg={MOODS[0]}>
      {moods.map((mood, i) => (
        <motion.div
          key={i}
          className="rb-bg"
          style={{ background: mood }}
          initial={false}
          animate={{ opacity: i === index % moods.length ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}
      <div className="rb-bg">
        <Rays at="50% 36%" strength={0.2} />
        <Confetti seed={10} count={18} />
        <PosterScene kind={ctx.style.escena} />
        <div className="rb-poster-shade" />
      </div>
      <Balloon
        color={balloons[0]!}
        style={{ left: '8%', top: '13%', width: u(58) }}
        duration={6.4}
      />
      <Balloon
        color={balloons[1]!}
        style={{ right: '9%', top: '10%', width: u(60) }}
        duration={7}
        delay={-2}
        tilt={4}
      />
      <Balloon
        color={balloons[2]!}
        style={{ right: '16%', top: '27%', width: u(56) }}
        duration={5.8}
        delay={-3}
      />
      <Balloon
        color={balloons[3]!}
        style={{ left: '14%', top: '30%', width: u(52) }}
        duration={6.8}
        delay={-1}
        tilt={3}
      />

      <PosterBody
        theme={theme}
        ctx={ctx}
        pick={pick}
        picks={picks}
        index={index}
        last={last}
        platforms={platforms}
        setSelected={setSelected}
        kickerColor="var(--rb-sol)"
      />
    </Stage>
  )
}

/** Las solapas por plataforma, el título y los botones (iguales en todas las ocasiones). */
type Pick = Props<'media.poster'>['buyer']['picks'][number]

function PosterBody({
  theme,
  ctx,
  pick,
  picks,
  index,
  last,
  platforms,
  setSelected,
  kickerColor,
}: {
  theme: Props<'media.poster'>['theme']
  ctx: Props<'media.poster'>['ctx']
  pick: Pick
  picks: Pick[]
  index: number
  last: boolean
  platforms: string[]
  setSelected: (index: number) => void
  kickerColor: string
}) {
  const active = ctx.active
  return (
    <div className="rb-body">
      {platforms.length > 1 && (
        <Appear active={active} y={-10} className="rb-tabs" style={{ marginTop: u(-30) }}>
          {platforms.map((platform) => {
            const on = pick.platform.trim() === platform
            return (
              <button
                key={platform}
                type="button"
                className={`rb-tab ${on ? 'is-on' : ''}`}
                onClick={() => setSelected(picks.findIndex((p) => p.platform.trim() === platform))}
                aria-pressed={on}
              >
                {platform}
                {on && <motion.i layoutId={`tab-${ctx.slideKey}`} className="rb-tab-line" />}
              </button>
            )
          })}
        </Appear>
      )}

      <div style={{ marginTop: 'auto', width: '100%' }}>
        <Appear
          as="p"
          active={active}
          delay={0.2}
          className="rb-kicker"
          style={{ color: kickerColor }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.out } }}
            exit={{ opacity: 0, y: -14, transition: { duration: 0.18 } }}
          >
            <h2
              className="rb-title"
              {...editable(ctx, 'picks')}
              style={{
                fontSize: u(pick.title.length > 18 ? 34 : 42),
                marginTop: u(8),
                overflowWrap: 'anywhere',
              }}
            >
              <EmojiText text={pick.title} />
            </h2>
            <p className="rb-sub" style={{ marginTop: u(8) }}>
              {platforms.length <= 1 && pick.platform ? `${pick.platform} • ` : ''}
              <EmojiText text={pick.tags} />
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="rb-actions is-row" style={{ marginTop: u(22), padding: 0 }}>
          {pick.link && (
            <Btn variant="white" href={pick.link} style={{ borderRadius: u(10) }}>
              <Play size={16} fill="currentColor" />
              <T text={theme.watchLabel} ctx={ctx} />
            </Btn>
          )}
          <Btn
            variant="dark"
            style={{ borderRadius: u(10) }}
            onClick={() => (last ? ctx.next() : setSelected(index + 1))}
          >
            <ArrowDown size={16} />
            <T text={theme.nextLabel} ctx={ctx} />
          </Btn>
        </div>
        <div style={{ height: u(46) }} />
      </div>
    </div>
  )
}
