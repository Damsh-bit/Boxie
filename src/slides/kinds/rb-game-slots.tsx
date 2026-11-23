import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Emoji, EmojiText } from '@/ui/Icon'
import { useCue, useSound } from '../player/use-sound'
import { Bokeh, Burst, Confetti, ROSE, Rays } from '../ribbly/art'
import { Btn, Chip, editable, Stage, T, TapMark, u } from '../ribbly/ui'
import { ease, spring } from './motion'
import type { Props } from './shared'

type Phase = 'ready' | 'spinning' | 'won'

/** Cuántas vueltas da la tira de símbolos antes de frenar en el ganador. */
const LOOPS = 3

/** Los símbolos de los rodillos (eje `simbolos`); sin elegir, los de la temática. */
const SYMBOL_SETS: Record<string, { symbols: string[]; win: string }> = {
  frutas: { symbols: ['🍒', '🍋', '🍉'], win: '7️⃣' },
  corazones: { symbols: ['corazon', 'corazon-flechado', 'carta-de-amor'], win: 'corazon-brillo' },
  estrellas: { symbols: ['estrella', 'destellos', 'trofeo'], win: 'estrella' },
}

/**
 * 11 · Tragamonedas. Tres vistas del diseño: lista para girar, girando (los
 * rodillos frenan de a uno, de izquierda a derecha) y jackpot con el premio.
 * El resultado siempre es favorable.
 */
export function GameSlots({ theme, buyer, ctx }: Props<'game.slots'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('ready')
  const [stopped, setStopped] = useState(0)

  const set = SYMBOL_SETS[ctx.style.simbolos ?? '']
  const symbols = set
    ? set.symbols
    : theme.symbols.length >= 3
      ? theme.symbols
      : ['globo', 'torta', 'cotillon']
  const winSymbol = set?.win ?? theme.winSymbol
  // La tira: varias vueltas de símbolos y, al final, el que gana.
  const strip = [...Array.from({ length: LOOPS }, () => symbols).flat(), winSymbol]
  const step = 100 / strip.length
  const last = strip.length - 1

  const mine = buyer.prizes.filter((p) => p.trim())
  const prizes = mine.length ? mine : theme.suggestions.filter((p) => p.trim())
  const prize = prizes[Math.min(buyer.winner, prizes.length) - 1] ?? prizes[0] ?? ''

  const spin = () => {
    if (phase !== 'ready') return
    setStopped(0)
    setPhase('spinning')
  }
  const play = useSound()
  const reelStopped = (reel: number) => {
    if (stopped <= reel) play('clunk', { step: reel })
    setStopped((n) => Math.max(n, reel + 1))
    if (reel === 2) setPhase('won')
  }
  // Los rodillos girando (el tic tic que frena) y el jackpot: llueven monedas.
  useCue(phase === 'spinning' && !calm, 'spin', 0.28, { duration: 2 })
  useCue(phase === 'won', 'coins', 0.1)

  return (
    <Stage
      tone="deep"
      bg={
        theme.look === 'pareja'
          ? 'radial-gradient(130% 80% at 50% 40%, #6B1830 0%, #4A1428 55%, #2A1430 100%)'
          : 'linear-gradient(180deg, #1B3B6F 0%, #3A2A6B 55%, #6B2A5E 100%)'
      }
      className={theme.look === 'pareja' ? 'is-pareja' : ''}
      data-maquina={
        ctx.style.maquina && ctx.style.maquina !== 'original' ? ctx.style.maquina : undefined
      }
    >
      <div className="rb-bg">
        <Rays at="50% 42%" strength={0.07} />
        <Bokeh
          seed={11}
          count={10}
          colors={
            theme.look === 'pareja'
              ? ['#F7798A', '#FFC56E', '#C88FD8']
              : ['#4FC3F7', '#FFD35C', '#F44E63']
          }
          blur={5}
          maxOpacity={0.45}
        />
        {phase === 'won' && (
          <Confetti seed={11} count={26} colors={theme.look === 'pareja' ? ROSE : undefined} />
        )}
      </div>

      <div className="rb-body">
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'won' ? (
            <motion.h2
              key="jackpot"
              className="rb-glow-title is-neon"
              style={{ marginTop: u(8) }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: spring.pop }}
            >
              <T text={theme.jackpot} ctx={ctx} />
            </motion.h2>
          ) : (
            <motion.div key="titulo" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              <p
                className="rb-kicker"
                style={{ marginTop: u(2), color: theme.look === 'pareja' ? '#FFC56E' : undefined }}
              >
                <T text={theme.kicker} ctx={ctx} />
              </p>
              <h2 className="rb-glow-title" style={{ marginTop: u(6) }}>
                <T text={theme.title} ctx={ctx} />
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="rb-slots"
          {...editable(ctx, '', 'maquina,simbolos')}
          style={{ marginTop: u(phase === 'won' ? 26 : 38) }}
          initial={false}
          animate={
            !active
              ? { y: 40, opacity: 0, scale: 0.92 }
              : phase === 'won' && !calm
                ? { y: 0, opacity: 1, scale: [1, 1.04, 1] }
                : { y: 0, opacity: 1, scale: 1 }
          }
          transition={
            !active
              ? { duration: 0.2 }
              : phase === 'won' && !calm
                ? { duration: 0.5, ease: 'easeOut' }
                : spring.bouncy
          }
        >
          <motion.i
            className="rb-lever"
            aria-hidden
            animate={
              phase === 'spinning'
                ? { rotate: [0, 0, 34, 0], scaleY: [1, 0.62, 0.62, 1] }
                : { rotate: 0, scaleY: 1 }
            }
            transition={{ duration: 0.7, times: [0, 0.3, 0.45, 1], ease: 'easeInOut' }}
          />
          <div className="rb-slots-top">
            <T text={theme.machine} ctx={ctx} />
          </div>
          <div className="rb-slots-body">
            <i className="rb-slots-lights" style={{ top: u(8) }} aria-hidden />
            <i className="rb-slots-lights is-b" style={{ bottom: u(10) }} aria-hidden />
            <div className="rb-slots-window">
              {[0, 1, 2].map((reel) => {
                const rest = phase === 'ready' ? reel % symbols.length : last
                const spinning = phase === 'spinning' && stopped <= reel
                return (
                  <div key={reel} className={`rb-reel ${spinning && !calm ? 'is-spinning' : ''}`}>
                    <motion.div
                      className="rb-reel-strip"
                      initial={false}
                      animate={{
                        y:
                          phase === 'spinning' && !calm
                            ? [
                                `-${rest === last ? (reel % symbols.length) * step : 0}%`,
                                `-${last * step + 1.2}%`,
                                `-${last * step}%`,
                              ]
                            : `-${rest * step}%`,
                      }}
                      transition={
                        phase === 'spinning' && !calm
                          ? { duration: 1.3 + reel * 0.5, times: [0, 0.94, 1], ease: ease.out }
                          : { duration: 0 }
                      }
                      onAnimationComplete={() => phase === 'spinning' && reelStopped(reel)}
                    >
                      {strip.map((symbol, i) => (
                        <span key={i}>
                          <Emoji value={symbol} size={u(62)} large />
                        </span>
                      ))}
                    </motion.div>
                  </div>
                )
              })}
              <i className="rb-payline" aria-hidden />
              <AnimatePresence>
                {phase === 'won' && (
                  <motion.span
                    key="cinta"
                    className="rb-ribbon"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '2%',
                      zIndex: 4,
                      background: 'linear-gradient(180deg, #FFE07A, #F6B53C)',
                      color: '#4A3410',
                      fontSize: u(22),
                      x: '-50%',
                    }}
                    initial={{ scale: 2.4, opacity: 0, rotate: -18 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      rotate: -4,
                      transition: { ...spring.pop, delay: 0.15 },
                    }}
                  >
                    <T text={theme.stamp} ctx={ctx} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="rb-coin" />
          </div>
          {phase === 'won' && <Burst key="jackpot" y="50%" count={56} power={1.25} cue={null} />}
        </motion.div>

        <div className="rb-grow" style={{ justifyContent: 'center' }}>
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'ready' && (
              <motion.div
                key="premios"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <p style={{ fontSize: u(12), fontWeight: 500, opacity: 0.8 }}>
                  <T text={theme.prizesLabel} ctx={ctx} />
                </p>
                <div
                  {...editable(ctx, 'prizes,winner')}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: u(6),
                    marginTop: u(10),
                  }}
                >
                  {prizes.map((p, i) => (
                    <Chip key={i} mods="is-glass" style={{ fontSize: u(12) }}>
                      <EmojiText text={p} />
                    </Chip>
                  ))}
                </div>
              </motion.div>
            )}
            {phase === 'spinning' && (
              <motion.p
                key="aliento"
                className="rb-hand"
                style={{ fontSize: u(25) }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <T text={theme.cheer} ctx={ctx} />
              </motion.p>
            )}
            {phase === 'won' && (
              <motion.div
                key="gano"
                className="rb-won"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { ...spring.bouncy, delay: 0.5 },
                }}
              >
                <p className="rb-kicker" style={{ fontSize: u(11), color: 'var(--rb-tinta-2)' }}>
                  <T text={theme.wonKicker} ctx={ctx} />
                </p>
                <p
                  className="rb-fredoka"
                  style={{ fontWeight: 600, fontSize: u(22), lineHeight: 1.15, marginTop: u(3) }}
                  {...editable(ctx, 'prizes,winner')}
                >
                  <EmojiText text={prize} />
                </p>
                <p style={{ fontSize: u(12), color: 'var(--rb-tinta-2)', marginTop: u(3) }}>
                  <T text={theme.wonBy} ctx={ctx} />
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rb-actions" style={{ marginTop: 0 }}>
          {phase === 'ready' && (
            <span style={{ position: 'relative' }}>
              <Btn
                variant="yellow"
                mods="is-big rb-fredoka"
                style={{ fontWeight: 700, color: 'var(--rb-noche)' }}
                // La palanca que baja.
                cue="lever"
                onClick={spin}
              >
                <T text={theme.spinLabel} ctx={ctx} />
              </Btn>
              <TapMark style={{ left: '50%', top: '50%' }} />
            </span>
          )}
          {phase === 'spinning' && (
            <Btn variant="glass" mods="is-wide" disabled style={{ opacity: 0.75 }}>
              <T text={theme.spinningLabel} ctx={ctx} />
            </Btn>
          )}
          {phase === 'won' && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}
            >
              <Btn variant="primary" mods="is-flat" onClick={ctx.next}>
                <T text={theme.ctaLabel} ctx={ctx} />
              </Btn>
            </motion.div>
          )}
        </div>
      </div>
    </Stage>
  )
}
