'use client'

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import { categoriesOf, type CatalogTheme } from '@/domain/catalog'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'

/**
 * Grilla de temáticas con filtros. Al filtrar, las tarjetas que quedan se
 * reacomodan deslizándose (layout) y las que salen se achican.
 */
export function GalleryGrid({ themes }: { themes: CatalogTheme[] }) {
  const [filter, setFilter] = useState('Todos')
  // La primera vez las tarjetas esperan a que termine de entrar el título.
  const [firstLoad, setFirstLoad] = useState(true)
  const categories = ['Todos', ...categoriesOf(themes)]
  const visible = filter === 'Todos' ? themes : themes.filter((t) => t.category === filter)

  return (
    <LayoutGroup>
      <motion.div
        className="mb-12 flex flex-wrap justify-center gap-2.5 px-5"
        role="group"
        aria-label="Filtrar por categoría"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }}
      >
        {categories.map((cat) => {
          const selected = filter === cat
          return (
            <motion.button
              key={cat}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setFilter(cat)
                setFirstLoad(false)
              }}
              className={cn(
                'relative rounded-full px-6 py-2.5 text-[0.95rem] font-medium transition-colors duration-300',
                selected ? 'text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {selected && (
                <motion.span
                  layoutId="filtro-activo"
                  className="absolute inset-0 rounded-full bg-brand shadow-[0_6px_18px_rgb(244_78_99/0.35)]"
                  transition={spring.snappy}
                />
              )}
              <span className="relative">{cat}</span>
            </motion.button>
          )
        })}
      </motion.div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 pb-20 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] sm:gap-10">
        <AnimatePresence mode="popLayout">
          {visible.map((theme, i) => (
            <GalleryCard key={theme.id} theme={theme} delay={(firstLoad ? 0.3 : 0.05) + i * 0.08} />
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}

function GalleryCard({ theme, delay }: { theme: CatalogTheme; delay: number }) {
  const href = `/tematicas/${theme.slug}` as Route
  return (
    <motion.article
      layout
      className="group relative overflow-hidden rounded-[24px] border border-neutral-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-shadow duration-300 hover:shadow-[0_24px_50px_rgba(42,36,51,0.12)]"
      initial="hidden"
      animate="show"
      exit="exit"
      whileHover="hover"
      variants={{
        hidden: { opacity: 0, y: 40, scale: 0.96 },
        show: { opacity: 1, y: 0, scale: 1, transition: { ...spring.soft, delay } },
        hover: { y: -8, transition: spring.soft },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
      }}
      transition={spring.soft}
    >
      <div className="relative h-[250px] w-full overflow-hidden sm:h-[280px]">
        <motion.div
          className="absolute inset-0"
          variants={{ show: { scale: 1 }, hover: { scale: 1.08 } }}
          transition={{ duration: 0.8, ease: ease.out }}
        >
          <Image
            src={theme.listing.images[1] ?? theme.listing.images[0]!}
            alt={theme.name}
            fill
            sizes="(max-width: 640px) 100vw, 380px"
            className="object-cover"
          />
        </motion.div>
        <motion.div
          className="absolute inset-0 hidden items-center justify-center bg-black/30 md:flex"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 0 }, hover: { opacity: 1 } }}
          transition={{ duration: 0.3 }}
          aria-hidden
        >
          <motion.span
            className="rounded-full bg-white px-8 py-3 text-sm font-bold text-black shadow-lg"
            variants={{
              hidden: { y: 16, opacity: 0 },
              show: { y: 16, opacity: 0 },
              hover: { y: 0, opacity: 1 },
            }}
            transition={spring.snappy}
          >
            Ver Boxie
          </motion.span>
        </motion.div>
      </div>
      <div className="flex items-start gap-3 p-5">
        <div className="min-w-0 flex-1">
          <span className="mb-2 block text-xs font-extrabold tracking-wider text-brand uppercase">
            {theme.category}
          </span>
          <h3 className="mb-2 text-2xl font-semibold text-neutral-900">
            {/* Toda la tarjeta es el link. */}
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {theme.name}
            </Link>
          </h3>
          <p className="text-[0.95rem] leading-relaxed text-neutral-500">
            {theme.listing.cardDescription || theme.description}
          </p>
        </div>
        <motion.span
          className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
          variants={{ show: { rotate: 0, scale: 1 }, hover: { rotate: 45, scale: 1.1 } }}
          transition={spring.bouncy}
          aria-hidden
        >
          <ArrowUpRight className="size-5" />
        </motion.span>
      </div>
    </motion.article>
  )
}
