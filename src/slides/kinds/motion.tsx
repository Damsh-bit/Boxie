'use client'

import { motion, useReducedMotion, type HTMLMotionProps, type Transition } from 'framer-motion'
import { ease, spring } from '../player/motion'

/**
 * Piezas de movimiento de las slides. Todas dependen de `active` (la slide
 * está en pantalla): entran cuando llega, se van rápido cuando sale y vuelven
 * a entrar si se vuelve a ella, como hacían las animaciones CSS del
 * prototipo con `.is-active`. Los loops corren con `transform` en string
 * (compositor) y solo mientras la slide está activa.
 */

const tags = {
  div: motion.div,
  span: motion.span,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  img: motion.img,
  button: motion.button,
}

type Tag = keyof typeof tags

type Base = Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'variants'> & {
  as?: Tag
  active: boolean
  delay?: number
  /** Con `as="img"`. */
  src?: string
  alt?: string
}

const leave: Transition = { duration: 0.2, ease: ease.out }

/** Sube y aparece cuando la slide queda en pantalla. */
export function Appear({
  as = 'div',
  active,
  delay = 0,
  y = 20,
  x = 0,
  scale = 1,
  duration = 0.8,
  ...props
}: Base & { y?: number; x?: number; scale?: number; duration?: number }) {
  const Component = tags[as] as typeof motion.div
  const hidden = { opacity: 0, y, x, scale }
  return (
    <Component
      initial={hidden}
      animate={
        active
          ? { opacity: 1, y: 0, x: 0, scale: 1, transition: { duration, ease: ease.out, delay } }
          : { ...hidden, transition: leave }
      }
      {...props}
    />
  )
}

/** Aparece con un resorte que se pasa un poquito (logos, stickers, premios). */
export function Pop({
  as = 'div',
  active,
  delay = 0,
  from = 0,
  rotate = 0,
  y = 0,
  ...props
}: Base & { from?: number; rotate?: number; y?: number }) {
  const Component = tags[as] as typeof motion.div
  const hidden = { opacity: 0, scale: from, rotate, y }
  return (
    <Component
      initial={hidden}
      animate={
        active
          ? { opacity: 1, scale: 1, rotate: 0, y: 0, transition: { ...spring.pop, delay } }
          : { ...hidden, transition: leave }
      }
      {...props}
    />
  )
}

/**
 * Loop decorativo (flotar, latir, rebotar, titilar). `frames` son valores de
 * `transform`; con la slide fuera de pantalla vuelve al primero y se queda.
 */
export function Loop({
  as = 'div',
  active,
  delay = 0,
  frames,
  opacity,
  duration,
  times,
  easing = 'easeInOut',
  ...props
}: Base & {
  frames: string[]
  /** Keyframes de opacidad, opcionales (mismo largo que `frames`). */
  opacity?: number[]
  duration: number
  times?: number[]
  easing?: Transition['ease']
}) {
  const Component = tags[as] as typeof motion.div
  const calm = useReducedMotion()
  const run = active && !calm
  return (
    <Component
      animate={
        run
          ? { transform: frames, ...(opacity ? { opacity } : {}) }
          : { transform: frames[0], ...(opacity ? { opacity: opacity[0] } : {}) }
      }
      transition={
        run ? { duration, delay, times, ease: easing, repeat: Infinity } : { duration: 0.3 }
      }
      {...props}
    />
  )
}

/** Keyframes de uso común para `Loop`. */
export const frames = {
  float: (px: number, rotate = 0) => [
    `translateY(0px) rotate(0deg)`,
    `translateY(${-px}px) rotate(${rotate}deg)`,
    `translateY(0px) rotate(0deg)`,
  ],
  pulse: (to: number) => ['scale(1)', `scale(${to})`, 'scale(1)'],
  bounce: (px: number) => ['translateY(0px)', `translateY(${-px}px)`, 'translateY(0px)'],
  wiggle: (deg: number) => [
    'rotate(0deg)',
    `rotate(${-deg}deg)`,
    `rotate(${deg}deg)`,
    `rotate(${-deg / 2}deg)`,
    'rotate(0deg)',
  ],
}

/** Temblor corto (respuesta incorrecta, galleta que se abre). */
export const shake = {
  x: [0, -6, 6, -5, 5, -3, 3, 0],
  rotate: [0, -1.5, 1.5, -1, 1, 0, 0, 0],
}

export { ease, spring }
