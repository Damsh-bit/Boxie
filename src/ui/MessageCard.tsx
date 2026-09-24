'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from './cn'
import { ease, spring, useCalm } from './motion'

/**
 * Tarjeta de aviso (link vencido, editor de prueba, regalo que no existe…):
 * entra subiendo, el emoji salta y después queda flotando.
 */
export function MessageCard({
  emoji,
  title,
  children,
  className,
}: {
  emoji: string
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  const calm = useCalm()
  return (
    <motion.div
      className={cn(
        'w-full max-w-xl rounded-[30px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10',
        className,
      )}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0, y: 36, scale: 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { ...spring.gentle, staggerChildren: 0.08, delayChildren: 0.15 },
        },
      }}
    >
      <motion.div
        className="mb-4 inline-block text-5xl"
        aria-hidden
        variants={{
          hidden: { scale: 0, rotate: -25 },
          show: { scale: 1, rotate: 0, transition: spring.bouncy },
        }}
      >
        <motion.span
          className="inline-block"
          animate={
            calm
              ? undefined
              : { transform: ['translateY(0px)', 'translateY(-6px)', 'translateY(0px)'] }
          }
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          {emoji}
        </motion.span>
      </motion.div>
      <motion.h1
        className="mb-3 font-display text-3xl font-bold text-ink"
        variants={{
          hidden: { opacity: 0, y: 12 },
          show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
        }}
      >
        {title}
      </motion.h1>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 12 },
          show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
