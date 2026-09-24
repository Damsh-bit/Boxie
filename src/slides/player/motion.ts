import type { Transition } from 'framer-motion'

/**
 * Movimiento del player. Vive acá (y no en src/ui) porque el player es
 * autónomo: lo usan el regalo, el editor y el constructor de temáticas.
 */

/** El resorte de pasar de slide: firme, sin rebote, y hereda la velocidad del dedo. */
export const SLIDE_SPRING = {
  type: 'spring',
  stiffness: 260,
  damping: 32,
  mass: 0.9,
  restDelta: 0.0005,
  restSpeed: 0.001,
} as const satisfies Transition

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const

export const spring = {
  snappy: { type: 'spring', visualDuration: 0.28, bounce: 0.18 },
  soft: { type: 'spring', visualDuration: 0.45, bounce: 0.08 },
  bouncy: { type: 'spring', visualDuration: 0.55, bounce: 0.38 },
  pop: { type: 'spring', visualDuration: 0.6, bounce: 0.5 },
  gentle: { type: 'spring', visualDuration: 0.65, bounce: 0.12 },
} as const satisfies Record<string, Transition>
