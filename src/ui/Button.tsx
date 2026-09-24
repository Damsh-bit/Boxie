'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { buttonVariants, type ButtonVariantProps } from './button-variants'
import { cn } from './cn'
import { spring } from './motion'

export { buttonVariants }

/**
 * Levantarse al pasar el mouse y hundirse al tocar: igual en todos los
 * botones. Con etiquetas ("hover", "tap") para que lo de adentro pueda
 * acompañar (ver `Nudge`).
 */
function pressable(variant: ButtonVariantProps['variant'], disabled?: boolean | null) {
  if (disabled) return {}
  return {
    initial: 'rest',
    animate: 'rest',
    whileHover: 'hover',
    whileTap: 'tap',
    variants: {
      rest: { y: 0, scale: 1 },
      hover: variant === 'ghost' ? { scale: 1.02 } : { y: -2 },
      tap: { scale: 0.96, y: 0 },
    },
    transition: spring.snappy,
  } as const
}

export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> &
  ButtonVariantProps & { children?: ReactNode }

export function Button({ className, variant, size, block, disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled}
      {...pressable(variant, disabled)}
      {...props}
    />
  )
}

const MotionLink = motion.create(Link)

export type ButtonLinkProps = Omit<HTMLMotionProps<'a'>, 'href' | 'children'> &
  ButtonVariantProps & {
    href: Route | string
    children?: ReactNode
    /** Links de afuera (WhatsApp, mailto, pestaña nueva): no pasan por el router. */
    external?: boolean
  }

/** Un link con cara de botón (y el mismo movimiento que `Button`). */
export function ButtonLink({
  className,
  variant,
  size,
  block,
  href,
  external,
  ...props
}: ButtonLinkProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className)
  if (external) {
    return <motion.a href={href} className={classes} {...pressable(variant)} {...props} />
  }
  return <MotionLink href={href as Route} className={classes} {...pressable(variant)} {...props} />
}

/**
 * Ícono que acompaña el hover del botón o link que lo contiene (una flecha que
 * avanza, un ícono que gira). El padre tiene que usar las etiquetas
 * "rest"/"hover" (como `Button`, `ButtonLink` y `LiftLink`).
 */
export function Nudge({
  children,
  x = 0,
  y = 0,
  rotate = 0,
  className,
}: {
  children: ReactNode
  x?: number
  y?: number
  rotate?: number
  className?: string
}) {
  return (
    <motion.span
      className={cn('inline-flex', className)}
      variants={{ rest: { x: 0, y: 0, rotate: 0 }, hover: { x, y, rotate } }}
      transition={spring.snappy}
    >
      {children}
    </motion.span>
  )
}
