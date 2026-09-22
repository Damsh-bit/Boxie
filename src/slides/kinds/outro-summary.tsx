import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  CircleCheck,
  Film,
  Gamepad2,
  Gift,
  Headphones,
  Heart,
  Moon,
  Music,
  PartyPopper,
  PenTool,
  Share2,
  Smile,
  Sparkles,
  Sun,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { RichText } from '../RichText'
import type { SummaryIcon } from '../types'
import { useActivated, type Props } from './shared'

const ICONS: Record<SummaryIcon, LucideIcon> = {
  gift: Gift,
  heart: Heart,
  music: Music,
  headphones: Headphones,
  smile: Smile,
  sun: Sun,
  ticket: Ticket,
  camera: Camera,
  'check-circle': CircleCheck,
  'pen-tool': PenTool,
  moon: Moon,
  film: Film,
  sparkles: Sparkles,
  gamepad: Gamepad2,
  party: PartyPopper,
}

const INTRO_MS = 4000
const ITEM_DELAY = 1.3
const SCROLL_START = 2.5
// El prototipo scrolleaba 1400 px para 13 ítems; se escala con la cantidad real.
const PX_PER_ITEM = 1400 / 13

type Phase = 'intro' | 'timeline' | 'outro'

/**
 * Repaso final. El prototipo tenía la lista de 13 ítems fija en el código; acá
 * se arma sola con las slides de la temática, así una temática nueva no
 * promete en el repaso algo que no tiene.
 */
export function OutroSummary({ theme, ctx }: Props<'outro.summary'>) {
  const activated = useActivated(ctx.active)
  const [phase, setPhase] = useState<Phase>('intro')
  const [run, setRun] = useState(0)
  const items = ctx.summaries
  const timelineMs = items.length * ITEM_DELAY * 1000 + SCROLL_START * 1000 + 2000
  const scrollPx = Math.max(0, items.length * PX_PER_ITEM)

  useEffect(() => {
    if (!activated || phase === 'outro') return
    const t = setTimeout(
      () => setPhase(phase === 'intro' ? 'timeline' : 'outro'),
      phase === 'intro' ? INTRO_MS : timelineMs,
    )
    return () => clearTimeout(t)
  }, [activated, phase, run, timelineMs])

  const replay = () => {
    setPhase('intro')
    setRun((r) => r + 1)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#fff0f3',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--bx-ink)',
        textAlign: 'left',
      }}
    >
      {activated && (
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key={`intro-${run}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -50, transition: { duration: 0.5 } }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: 40,
                zIndex: 10,
              }}
            >
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontWeight: 'normal', fontSize: '1.2rem', marginBottom: 10 }}
              >
                {theme.wait}
              </motion.h3>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring' }}
                style={{
                  background: 'var(--bx-primary)',
                  color: 'white',
                  padding: '15px 25px',
                  fontSize: '2rem',
                  fontWeight: 900,
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  rotate: -2,
                  marginBottom: 15,
                  boxShadow: '5px 5px 0px rgba(0,0,0,0.1)',
                }}
              >
                {theme.badge1}
              </motion.div>
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  background: 'var(--bx-ink)',
                  color: 'white',
                  padding: '15px 25px',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  display: 'inline-block',
                  rotate: 1,
                  alignSelf: 'flex-start',
                  marginBottom: 20,
                  boxShadow: '5px 5px 0px rgba(244,78,99,0.3)',
                }}
              >
                {theme.badge2}
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                style={{ fontSize: '1.2rem', marginTop: 20 }}
              >
                {theme.intro}
              </motion.p>
            </motion.div>
          )}

          {phase === 'timeline' && (
            <motion.div
              key={`timeline-${run}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.8 } }}
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  paddingTop: 40,
                  paddingBottom: 20,
                  textAlign: 'center',
                  background: 'linear-gradient(to bottom, #fff0f3 80%, transparent)',
                  zIndex: 10,
                  position: 'absolute',
                  top: 0,
                  width: '100%',
                }}
              >
                <h2
                  style={{
                    color: 'var(--bx-primary)',
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    margin: 0,
                  }}
                >
                  {theme.timelineTitle}
                </h2>
              </div>
              <motion.div
                style={{ padding: '100px 20px 200px 20px', position: 'relative' }}
                animate={{ y: [0, -scrollPx] }}
                transition={{
                  delay: SCROLL_START,
                  duration: timelineMs / 1000 - SCROLL_START,
                  ease: 'linear',
                }}
              >
                <svg
                  width="100%"
                  height={Math.max(2000, scrollPx + 600)}
                  viewBox={`0 0 300 ${Math.max(2000, scrollPx + 600)}`}
                  style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, overflow: 'visible' }}
                  aria-hidden
                >
                  <motion.path
                    d="M 150 80 C 250 180, 50 280, 150 380 C 250 480, 50 580, 150 680 C 250 780, 50 880, 150 980 C 250 1080, 50 1180, 150 1280 C 250 1380, 50 1480, 150 1580 C 250 1680, 50 1780, 150 1880"
                    fill="transparent"
                    stroke="var(--bx-primary)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      delay: SCROLL_START - 0.5,
                      duration: timelineMs / 1000 - SCROLL_START,
                      ease: 'linear',
                    }}
                  />
                </svg>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 85,
                  }}
                >
                  {items.map((item, i) => {
                    const Icon = ICONS[item.icon] ?? Sparkles
                    const even = i % 2 === 0
                    const appear = 0.5 + i * ITEM_DELAY
                    return (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, x: even ? -30 : 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: appear }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexDirection: even ? 'row' : 'row-reverse',
                          gap: 12,
                          position: 'relative',
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: appear, type: 'spring' }}
                          style={{
                            width: 42,
                            height: 42,
                            background: 'var(--bx-primary)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            flexShrink: 0,
                            boxShadow: '0 0 0 4px #fff0f3, 0 4px 10px rgba(244,78,99,0.3)',
                            zIndex: 2,
                          }}
                        >
                          <Icon size={22} />
                        </motion.div>
                        <div
                          style={{
                            background: 'white',
                            padding: '12px 18px',
                            borderRadius: 15,
                            boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
                            flex: 1,
                            textAlign: even ? 'left' : 'right',
                            minWidth: 0,
                          }}
                        >
                          <h4
                            style={{
                              margin: '0 0 3px 0',
                              color: 'var(--bx-primary)',
                              fontWeight: 900,
                              fontSize: '0.95rem',
                            }}
                          >
                            {item.title}
                          </h4>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '0.8rem',
                              color: '#666',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.text}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div
              key={`outro-${run}`}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 30,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #fff0f3 0%, #ffe4e9 100%)',
              }}
            >
              <motion.img
                src={ctx.logoUrl}
                alt="Boxie"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
                style={{ width: 130, marginBottom: 30 }}
              />
              <h2
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: 'var(--bx-primary)',
                  margin: '0 0 10px 0',
                }}
              >
                {theme.thanksTitle}
              </h2>
              <p
                style={{
                  fontSize: '1.1rem',
                  maxWidth: 320,
                  lineHeight: 1.5,
                  marginBottom: 25,
                  color: '#555',
                }}
              >
                {theme.thanksText}
              </p>
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                style={{
                  background: 'white',
                  padding: 25,
                  borderRadius: 25,
                  boxShadow: '0 15px 30px rgba(244,78,99,0.15)',
                  maxWidth: 320,
                }}
              >
                <Heart
                  size={30}
                  color="var(--bx-primary)"
                  fill="var(--bx-primary)"
                  style={{ marginBottom: 15 }}
                />
                <p
                  style={{
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    marginBottom: 10,
                    color: 'var(--bx-ink)',
                  }}
                >
                  {theme.favorTitle}
                </p>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 20, lineHeight: 1.4 }}>
                  <RichText value={theme.favorText} />
                </p>
                <div
                  style={{
                    background: 'var(--bx-primary)',
                    color: 'white',
                    padding: 12,
                    borderRadius: 50,
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 15,
                  }}
                >
                  <Share2 size={18} /> {theme.handle}
                </div>
                <button
                  type="button"
                  onClick={replay}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#999',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    marginTop: 5,
                  }}
                >
                  {theme.replayLabel}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
