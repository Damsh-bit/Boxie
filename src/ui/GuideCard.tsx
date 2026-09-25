'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Route } from 'next'
import { cn } from './cn'
import { spring } from './motion'

const MotionLink = motion.create(Link)

/** Tarjeta de "¿Qué Boxie elegir?": se levanta y el emoji salta al pasar el mouse. */
export function GuideCard({
  href,
  emoji,
  title,
  text,
  compact = false,
}: {
  href: Route
  emoji: string
  title: string
  text: string
  compact?: boolean
}) {
  return (
    <MotionLink
      href={href}
      className={cn(
        'block h-full rounded-[25px] border border-neutral-200 bg-white text-left transition-[border-color,box-shadow] duration-300 hover:border-brand hover:shadow-[0_20px_40px_rgb(244_78_99/0.12)]',
        compact ? 'p-8' : 'px-8 py-10',
      )}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      variants={{ rest: { y: 0 }, hover: { y: -10 } }}
      transition={spring.soft}
    >
      <motion.span
        className={cn('block origin-bottom-left', compact ? 'mb-3 text-4xl' : 'mb-5 text-5xl')}
        variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: -10, scale: 1.15 } }}
        transition={spring.bouncy}
        aria-hidden
      >
        {emoji}
      </motion.span>
      <h3
        className={cn(
          'font-display font-bold text-ink',
          compact ? 'mb-2 text-xl' : 'mb-3 text-2xl',
        )}
      >
        {title}
      </h3>
      <p className="text-[0.95rem] leading-relaxed text-ink/65">{text}</p>
    </MotionLink>
  )
}
