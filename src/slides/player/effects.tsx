'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * Efectos decorativos del player. El prototipo usaba Math.random() durante el
 * render: con renderizado en servidor eso produce un HTML distinto al del
 * cliente. Acá el azar es determinístico (misma semilla → mismos valores).
 *
 * Se animan con framer-motion usando `transform` y `opacity` en string: van
 * al compositor, así no se traban aunque el editor esté re-renderizando la
 * vista previa en cada tecla.
 */

export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type ParticleType = 'none' | 'heart' | 'friend' | 'bday-fest' | 'circle'

const EMOJIS: Record<string, string[]> = {
  friend: ['😎', '✌️', '✨', '⚡', '🥂', '🔥'],
  'bday-fest': ['🎂', '🎈', '🎉', '🎁', '✨', '🥳'],
}

export function FloatingParticles({
  type,
  seed = 1,
}: {
  type: ParticleType
  seed?: number
  /** Compatibilidad: las partículas flotan mientras la slide está montada. */
  active?: boolean
}) {
  const calm = useReducedMotion()
  const particles = useMemo(() => {
    const rand = seededRandom(seed * 7919 + type.length)
    return Array.from({ length: 15 }, () => {
      const pool = EMOJIS[type]
      return {
        left: `${rand() * 100}%`,
        top: `${rand() * 100}%`,
        delay: rand() * 5,
        duration: 6 + rand() * 5,
        size: `${rand() * 10 + 10}px`,
        content: type === 'heart' ? '❤' : pool ? pool[Math.floor(rand() * pool.length)] : '',
      }
    })
  }, [type, seed])

  if (type === 'none') return null
  const isCircle = type === 'circle'
  const peak = type === 'friend' || type === 'bday-fest' ? 0.45 : 0.6
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      aria-hidden
    >
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="bx-particle"
          style={{
            left: p.left,
            top: p.top,
            fontSize: isCircle ? 0 : '24px',
            width: isCircle ? p.size : 'auto',
            height: isCircle ? p.size : 'auto',
            backgroundColor: isCircle ? 'rgba(255,255,255,0.2)' : 'transparent',
            borderRadius: '50%',
            color: type === 'heart' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.8)',
          }}
          initial={{ opacity: 0 }}
          animate={
            calm
              ? undefined
              : {
                  opacity: [0, peak, 0],
                  transform: [
                    'translateY(0vh) rotate(0deg)',
                    'translateY(-50vh) rotate(180deg)',
                    'translateY(-100vh) rotate(360deg)',
                  ],
                }
          }
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        >
          {p.content}
        </motion.div>
      ))}
    </div>
  )
}

const CONFETTI_COLORS = ['#F44E63', '#FFD700', '#2A2433', '#ffffff']

/**
 * Confeti que sube, una vez. Con `standalone` es el de los premios (aparece
 * con el premio); si no, el de la slide: arranca cada vez que la slide queda
 * en pantalla.
 */
export function ConfettiLayer({
  seed = 3,
  standalone = false,
  active = true,
}: {
  seed?: number
  standalone?: boolean
  active?: boolean
}) {
  const calm = useReducedMotion()
  const pieces = useMemo(() => {
    const rand = seededRandom(seed)
    return Array.from({ length: 50 }, () => ({
      left: `${rand() * 100}%`,
      size: `${rand() * 8 + 6}px`,
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      shape: rand() > 0.5 ? '50%' : '0px',
      duration: rand() * 2 + 3,
      delay: rand() * 2,
      spin: (rand() - 0.5) * 720,
      sway: (rand() - 0.5) * 80,
    }))
  }, [seed])

  if (!standalone && !active) return null
  return (
    <div className={standalone ? 'bx-confetti-layer' : 'bx-confetti'} aria-hidden>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="bx-confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape,
          }}
          initial={{ opacity: 0 }}
          animate={
            calm
              ? undefined
              : {
                  opacity: [1, 1, 0.8],
                  transform: [
                    'translate(0px, 0vh) rotate(0deg)',
                    `translate(${p.sway}px, -60vh) rotate(${p.spin / 2}deg)`,
                    `translate(${-p.sway / 2}px, -125vh) rotate(${p.spin}deg)`,
                  ],
                }
          }
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

/**
 * Degradé que se mueve despacio. El prototipo animaba `background-position`,
 * que repinta toda la slide en cada cuadro; acá se desliza una capa más grande
 * con `transform` (compositor): el mismo efecto, sin costo.
 */
export function GradientDrift({
  colors,
  angle = -45,
  duration = 15,
}: {
  colors: string[]
  angle?: number
  duration?: number
}) {
  const calm = useReducedMotion()
  const start = 'translate(0%, -30%)'
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '250%',
          height: '250%',
          background: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
          transform: start,
        }}
        animate={calm ? undefined : { transform: [start, 'translate(-60%, -30%)', start] }}
        transition={{ duration, ease: 'easeInOut', repeat: Infinity }}
      />
    </div>
  )
}

/** Mosaico de logos de Boxie de fondo (trivia y cuponera), que deriva despacio en diagonal. */
export function LogoPattern({ logoUrl, count = 60 }: { logoUrl: string; count?: number }) {
  const calm = useReducedMotion()
  return (
    <motion.div
      className="bx-logo-pattern"
      aria-hidden
      animate={
        calm
          ? undefined
          : {
              // Un logo + un espacio = 100 px: correrse exactamente eso hace el loop invisible.
              transform: ['rotate(-15deg) translateX(0px)', 'rotate(-15deg) translateX(-100px)'],
            }
      }
      transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <img key={i} src={logoUrl} alt="" />
      ))}
    </motion.div>
  )
}
