import { useMemo } from 'react'

/**
 * Efectos decorativos del player. El prototipo usaba Math.random() durante el
 * render: con renderizado en servidor eso produce un HTML distinto al del
 * cliente. Acá el azar es determinístico (misma semilla → mismos valores).
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

export function FloatingParticles({ type, seed = 1 }: { type: ParticleType; seed?: number }) {
  const particles = useMemo(() => {
    const rand = seededRandom(seed * 7919 + type.length)
    return Array.from({ length: 15 }, () => {
      const pool = EMOJIS[type]
      return {
        left: `${rand() * 100}%`,
        top: `${rand() * 100}%`,
        delay: `${rand() * 5}s`,
        duration: `${6 + rand() * 5}s`,
        size: `${rand() * 10 + 10}px`,
        content: type === 'heart' ? '❤' : pool ? pool[Math.floor(rand() * pool.length)] : '',
      }
    })
  }, [type, seed])

  if (type === 'none') return null
  const isCircle = type === 'circle'
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
        <div
          key={i}
          className="bx-particle"
          style={{
            left: p.left,
            top: p.top,
            fontSize: isCircle ? 0 : '24px',
            width: isCircle ? p.size : 'auto',
            height: isCircle ? p.size : 'auto',
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: isCircle ? 'rgba(255,255,255,0.2)' : 'transparent',
            borderRadius: '50%',
            color: type === 'heart' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.8)',
            opacity: type === 'friend' || type === 'bday-fest' ? 0.7 : 1,
          }}
        >
          {p.content}
        </div>
      ))}
    </div>
  )
}

const CONFETTI_COLORS = ['#F44E63', '#FFD700', '#2A2433', '#ffffff']

/** Confeti que sube. Con `standalone` se anima siempre (premios), si no, solo en la slide activa. */
export function ConfettiLayer({
  seed = 3,
  standalone = false,
}: {
  seed?: number
  standalone?: boolean
}) {
  const pieces = useMemo(() => {
    const rand = seededRandom(seed)
    return Array.from({ length: 50 }, () => ({
      left: `${rand() * 100}%`,
      size: `${rand() * 8 + 6}px`,
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      shape: rand() > 0.5 ? '50%' : '0px',
      duration: `${rand() * 2 + 3}s`,
      delay: `${rand() * 2}s`,
    }))
  }, [seed])

  return (
    <div className={standalone ? 'bx-confetti-layer' : 'bx-confetti'} aria-hidden>
      {pieces.map((p, i) => (
        <div
          key={i}
          className="bx-confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

/** Mosaico de logos de Boxie de fondo (trivia y cuponera). */
export function LogoPattern({ logoUrl, count = 60 }: { logoUrl: string; count?: number }) {
  return (
    <div className="bx-logo-pattern" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <img key={i} src={logoUrl} alt="" />
      ))}
    </div>
  )
}
