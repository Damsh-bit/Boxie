import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { RichText } from '../RichText'
import { Appear, ease, frames, Loop, Pop, spring } from './motion'
import type { Props } from './shared'

const COINS = [
  { left: '10%', delay: 0, content: '✨', duration: 3 },
  { left: '30%', delay: 0.5, content: 'logo', duration: 3.4 },
  { left: '50%', delay: 1, content: '🎁', duration: 2.8 },
  { left: '70%', delay: 0.3, content: '✨', duration: 3.2 },
  { left: '88%', delay: 1.4, content: '🎁', duration: 3.6 },
]

export function GameJackpot({ theme, ctx }: Props<'game.jackpot'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const [spinning, setSpinning] = useState(false)
  const [stopped, setStopped] = useState([true, true, true])
  const [won, setWon] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setStopped([false, false, false])
    setWon(false)
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))
    at(1200, () => setStopped([true, false, false]))
    at(1800, () => setStopped([true, true, false]))
    at(2500, () => {
      setStopped([true, true, true])
      setSpinning(false)
      at(500, () => setWon(true))
      if (!ctx.preview && typeof navigator !== 'undefined' && 'vibrate' in navigator)
        navigator.vibrate([100, 50, 100, 50, 300])
    })
  }

  const symbols = theme.symbols.length ? theme.symbols : ['🎁']

  return (
    <div className="bx-slot">
      <Loop
        active={active}
        className="bx-slot-lights"
        duration={8}
        frames={frames.pulse(1.1)}
        opacity={[0.5, 0.8, 0.5]}
      />
      <Appear as="h1" active={active} y={-20} className="bx-slot-title">
        <RichText value={theme.title} />
      </Appear>
      <Pop active={active} delay={0.15} from={0.7} className="bx-reels">
        <div className="bx-payline" />
        {[0, 1, 2].map((reel) => (
          <div key={reel} className="bx-reel">
            <AnimatePresence initial={false} mode="popLayout">
              {stopped[reel] ? (
                <motion.div
                  key="stop"
                  className="bx-slot-icon"
                  style={{ height: '100%' }}
                  // Frena con un rebotecito, como una ruleta de verdad.
                  initial={{ y: -60, scale: 0.8 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={spring.pop}
                >
                  <img src={ctx.logoUrl} alt="Boxie" />
                </motion.div>
              ) : (
                <motion.div
                  key="spin"
                  className="bx-reel-strip"
                  initial={{ transform: 'translateY(0%)', filter: 'blur(4px)' }}
                  animate={
                    calm
                      ? { transform: 'translateY(0%)' }
                      : { transform: ['translateY(0%)', 'translateY(-50%)'] }
                  }
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.2, repeat: Infinity, ease: 'linear' }}
                >
                  {[...symbols, ...symbols].map((symbol, i) => (
                    <div key={i} className="bx-slot-icon">
                      {symbol}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </Pop>
      <AnimatePresence mode="wait" initial={false}>
        {!won ? (
          <Appear key="girar" active={active} delay={0.3} y={20} style={{ zIndex: 10 }}>
            <motion.button
              type="button"
              className="bx-spin-btn"
              onClick={spin}
              disabled={spinning}
              whileTap={{ scale: 0.94 }}
              animate={{ opacity: spinning ? 0.7 : 1 }}
              transition={spring.snappy}
            >
              {spinning ? '...' : theme.spinLabel}
            </motion.button>
          </Appear>
        ) : (
          <Loop
            key="ganaste"
            active={active}
            duration={1}
            frames={frames.pulse(1.05)}
            style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem', zIndex: 10 }}
          >
            {theme.wonLabel}
          </Loop>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {won && (
          <motion.div
            key="premio"
            className="bx-win-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {!calm &&
              COINS.map((coin, i) =>
                coin.content === 'logo' ? (
                  <motion.img
                    key={i}
                    src={ctx.logoUrl}
                    className="bx-coin"
                    style={{ left: coin.left, width: 50 }}
                    alt=""
                    animate={{
                      transform: [
                        'translateY(-60px) rotate(0deg)',
                        'translateY(110vh) rotate(360deg)',
                      ],
                      opacity: [1, 0.7],
                    }}
                    transition={{
                      duration: coin.duration,
                      delay: coin.delay,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                ) : (
                  <motion.div
                    key={i}
                    className="bx-coin"
                    style={{ left: coin.left }}
                    animate={{
                      transform: [
                        'translateY(-60px) rotate(0deg)',
                        'translateY(110vh) rotate(360deg)',
                      ],
                      opacity: [1, 0.7],
                    }}
                    transition={{
                      duration: coin.duration,
                      delay: coin.delay,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    {coin.content}
                  </motion.div>
                ),
              )}
            <motion.img
              src={ctx.logoUrl}
              alt="Boxie"
              style={{
                width: 140,
                filter: 'drop-shadow(0 0 25px var(--bx-primary))',
                marginBottom: 20,
              }}
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring.pop, delay: 0.15 }}
            />
            <motion.h1
              className="bx-win-title"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring.pop, delay: 0.3 }}
            >
              {theme.winTitle}
            </motion.h1>
            <motion.p
              style={{ fontSize: '1.4rem', color: 'white', marginBottom: 20 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5, ease: ease.out }}
            >
              {theme.winText}
            </motion.p>
            <Loop
              active={active}
              delay={0.8}
              duration={2}
              frames={frames.bounce(10)}
              className="bx-win-hint"
            >
              {theme.scrollHint}
            </Loop>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
