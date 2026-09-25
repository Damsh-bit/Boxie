'use client'

import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { ease, Reveal, useCalm } from '@/ui/motion'

/**
 * Piezas que se repiten en toda la home. La idea es que cada sección tenga su
 * interacción propia pero hable el mismo idioma: títulos con una palabra
 * subrayada a mano, tarjetas que se inclinan hacia el mouse, botones que se
 * dejan atraer y números que cuentan al aparecer.
 */

/** La palabra destacada de un título: en coral, con un subrayado que se dibuja al llegar. */
export function Mark({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-block whitespace-nowrap text-brand', className)}>
      {children}
      <motion.svg
        aria-hidden
        viewBox="0 0 200 14"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.18em] left-0 h-[0.32em] w-full overflow-visible text-brand/45"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.9 }}
      >
        <motion.path
          d="M3 9 C 45 3, 85 2, 115 6 S 172 12, 197 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            show: {
              pathLength: 1,
              opacity: 1,
              transition: { duration: 0.9, ease: ease.out, delay: 0.4 },
            },
          }}
        />
      </motion.svg>
    </span>
  )
}

/** Encabezado de sección: etiqueta, título y bajada, que entran escalonados. */
export function SectionHeading({
  eyebrow,
  title,
  text,
  dark = false,
  align = 'center',
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  text?: ReactNode
  dark?: boolean
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-10 max-w-2xl sm:mb-12',
        align === 'center' ? 'mx-auto text-center' : 'text-center lg:text-left',
        className,
      )}
    >
      {eyebrow && (
        <Reveal
          as="span"
          className={cn(
            'mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.18em] uppercase',
            dark ? 'bg-white/10 text-brand-muted' : 'bg-brand/10 text-brand',
          )}
        >
          {eyebrow}
        </Reveal>
      )}
      <Reveal
        as="h2"
        delay={0.05}
        className={cn(
          'font-display text-[2.1rem] leading-[1.08] font-bold text-balance sm:text-5xl',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </Reveal>
      {text && (
        <Reveal
          as="p"
          delay={0.1}
          className={cn(
            'mt-4 text-lg leading-relaxed text-pretty',
            dark ? 'text-white/70' : 'text-ink/70',
          )}
        >
          {text}
        </Reveal>
      )}
    </div>
  )
}

/** Un celular: el marco de las vistas previas de Boxie. */
export function PhoneFrame({
  children,
  className,
  label,
}: {
  children: ReactNode
  className?: string
  /** Si es solo una imagen (no se puede tocar), su descripción. */
  label?: string
}) {
  return (
    <div
      className={cn(
        'relative isolate aspect-[9/19] overflow-hidden rounded-[44px] border-[7px] border-[#16131a] bg-ink shadow-[0_50px_90px_-25px_rgba(42,36,51,0.55)]',
        className,
      )}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <span
        aria-hidden
        className="absolute top-2 left-1/2 z-40 h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-[#16131a]"
      />
      {children}
    </div>
  )
}

/**
 * Número que cuenta desde cero cuando entra en pantalla. El servidor ya manda
 * el valor final (sin JavaScript se lee igual); al hidratar, si todavía no se
 * ve, vuelve a cero y espera su turno.
 */
export function CountUp({
  to,
  prefix = '',
  suffix = '',
  duration = 1.6,
  className,
}: {
  to: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const calm = useCalm()

  useEffect(() => {
    const el = ref.current
    if (!el || calm) return
    const write = (v: number) => {
      el.textContent = `${prefix}${Math.round(v).toLocaleString('es-AR')}${suffix}`
    }
    if (!inView) {
      write(0)
      return
    }
    const controls = animate(0, to, { duration, ease: ease.out, onUpdate: write })
    return () => controls.stop()
  }, [inView, calm, to, prefix, suffix, duration])

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {`${prefix}${to.toLocaleString('es-AR')}${suffix}`}
    </span>
  )
}

/**
 * Se deja atraer por el mouse (botones importantes). En pantallas táctiles y
 * con "reducir movimiento" se queda quieto.
 */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const calm = useCalm()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 })

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || calm || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={cn('inline-flex', className)}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  )
}

/**
 * Inclinación 3D hacia el mouse, con un brillo que lo sigue. Devuelve el
 * estilo para el elemento que se inclina y los manejadores del puntero.
 */
export function useTilt(max = 8) {
  const calm = useCalm()
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const gx = useMotionValue(50)
  const gy = useMotionValue(50)
  const rotateX = useSpring(rx, { stiffness: 180, damping: 18 })
  const rotateY = useSpring(ry, { stiffness: 180, damping: 18 })
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.38), transparent 55%)`

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (calm || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    ry.set((px - 0.5) * max * 2)
    rx.set(-(py - 0.5) * max * 2)
    gx.set(px * 100)
    gy.set(py * 100)
  }
  const onPointerLeave = () => {
    rx.set(0)
    ry.set(0)
    gx.set(50)
    gy.set(50)
  }

  return {
    style: { rotateX, rotateY, transformPerspective: 1000 },
    glare,
    handlers: { onPointerMove, onPointerLeave },
  }
}
