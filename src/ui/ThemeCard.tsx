'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import type { CatalogTheme } from '@/domain/catalog'
import { cn } from './cn'
import { spring } from './motion'

const MotionLink = motion.create(Link)

/** Tarjeta de temática de la home ("¿A quién querés emocionar hoy?"). */
export function ThemeCard({
  theme,
  priority = false,
}: {
  theme: CatalogTheme
  priority?: boolean
}) {
  const light = theme.listing.cardTone === 'light'
  return (
    <MotionLink
      href={`/tematicas/${theme.slug}` as Route}
      className="group relative flex min-h-[424px] w-[290px] shrink-0 snap-center flex-col overflow-hidden rounded-3xl border-2 shadow-[0_10px_30px_rgba(42,36,51,0.12)] transition-shadow duration-300 hover:shadow-[0_28px_60px_rgba(42,36,51,0.22)] sm:w-[304px]"
      style={{ backgroundColor: theme.listing.cardColor, borderColor: theme.listing.cardColor }}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="tap"
      variants={{ rest: { y: 0, scale: 1 }, hover: { y: -10 }, tap: { scale: 0.97 } }}
      transition={spring.soft}
    >
      <div className="relative h-[296px] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          variants={{ rest: { scale: 1 }, hover: { scale: 1.07 } }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={theme.listing.images[0]!}
            alt={theme.name}
            fill
            sizes="304px"
            priority={priority}
            className="object-cover"
          />
        </motion.div>
        <motion.span
          className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur"
          variants={{
            rest: { opacity: 0, scale: 0.6, rotate: -45 },
            hover: { opacity: 1, scale: 1, rotate: 0 },
          }}
          transition={spring.bouncy}
          aria-hidden
        >
          <ArrowUpRight className="size-5" />
        </motion.span>
      </div>
      <div className="p-6 text-left">
        <h3 className="mb-2 font-display text-[32px] leading-tight font-bold text-ink">
          {theme.name}
        </h3>
        <p className={cn('text-base font-medium', light ? 'text-white' : 'text-ink/85')}>
          {theme.listing.cardDescription || theme.description}
        </p>
      </div>
    </MotionLink>
  )
}
