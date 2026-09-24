'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { ease, spring } from './motion'

const MotionLink = motion.create(Link)

type Props = Omit<HTMLMotionProps<'a'>, 'href' | 'children'> & {
  href: Route | string
  children?: ReactNode
  /** Cuánto se levanta al pasar el mouse (px). */
  lift?: number
}

/**
 * Link-tarjeta: se levanta con un resorte al pasar el mouse y se hunde al
 * tocar. Propaga "hover" a sus hijos (ver `HoverZoom`).
 */
export function LiftLink({ href, lift = 6, children, ...props }: Props) {
  return (
    <MotionLink
      href={href as Route}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="tap"
      variants={{ rest: { y: 0, scale: 1 }, hover: { y: -lift }, tap: { scale: 0.98 } }}
      transition={spring.soft}
      {...props}
    >
      {children}
    </MotionLink>
  )
}

/** Imagen (u otro contenido) que se acerca cuando el `LiftLink` que la contiene está en hover. */
export function HoverZoom({
  children,
  className,
  scale = 1.1,
}: {
  children: ReactNode
  className?: string
  scale?: number
}) {
  return (
    <motion.div
      className={className}
      variants={{ rest: { scale: 1 }, hover: { scale } }}
      transition={{ duration: 0.8, ease: ease.out }}
    >
      {children}
    </motion.div>
  )
}
