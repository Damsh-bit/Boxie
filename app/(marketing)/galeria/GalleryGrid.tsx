'use client'

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowUpRight, Play, Search, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import { useDeferredValue, useState } from 'react'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'

/** Una temática como la muestra la galería (la arma la página con el catálogo). */
export interface GalleryTheme {
  id: string
  slug: string
  name: string
  category: string
  description: string
  image: string
  emoji: string
  /** "Desde $ 3.490" · "$ 4.990" (el del plan elegido, si vino uno). */
  priceLabel: string
}

/** Sin tildes ni mayúsculas: "Cumpleaños" se encuentra escribiendo "cumpleanos". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Con más temáticas que esto, aparece el buscador. */
const SEARCH_FROM = 6

/**
 * Grilla de temáticas con filtros por categoría (y buscador cuando el
 * catálogo crece). Al filtrar, las tarjetas que quedan se reacomodan
 * deslizándose y las que salen se achican.
 */
export function GalleryGrid({ themes, plan }: { themes: GalleryTheme[]; plan: string | null }) {
  const [filter, setFilter] = useState('Todas')
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  // La primera vez las tarjetas esperan a que termine de entrar el título.
  const [firstLoad, setFirstLoad] = useState(true)
  const categories = ['Todas', ...new Set(themes.map((t) => t.category))]
  const needle = fold(deferred.trim())
  const visible = themes.filter(
    (t) =>
      (filter === 'Todas' || t.category === filter) &&
      (!needle || fold(`${t.name} ${t.category} ${t.description}`).includes(needle)),
  )

  return (
    <LayoutGroup>
      <div className="mx-auto mb-10 flex max-w-6xl flex-col items-center gap-4 px-5 sm:px-8">
        {themes.length > SEARCH_FROM && (
          <label className="relative w-full max-w-md">
            <span className="sr-only">Buscar una temática</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/40"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setFirstLoad(false)
              }}
              placeholder="Buscá una ocasión: cumpleaños, mamá, mascotas…"
              className="h-12 w-full rounded-full border border-black/10 bg-white pr-11 pl-12 text-base text-ink shadow-[0_6px_20px_rgba(42,36,51,0.06)] transition-[border-color,box-shadow] outline-none placeholder:text-ink/40 focus:border-brand focus:shadow-[0_0_0_4px_rgba(244,78,99,0.15)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Borrar la búsqueda"
                className="absolute top-1/2 right-2.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink/50 hover:bg-paper hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </label>
        )}

        {categories.length > 2 && (
          <motion.div
            className="flex max-w-full [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden"
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
                    'relative shrink-0 rounded-full px-5 py-2.5 text-[0.95rem] font-semibold transition-colors duration-300',
                    selected
                      ? 'text-white'
                      : 'bg-paper/70 text-ink/70 hover:bg-paper hover:text-ink',
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
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length === 1 ? 'Una temática' : `${visible.length} temáticas`}
      </p>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-5 pb-16 sm:grid-cols-2 sm:gap-8 sm:px-8 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((theme, i) => (
            <GalleryCard
              key={theme.id}
              theme={theme}
              plan={plan}
              priority={i < 3}
              delay={(firstLoad ? 0.3 : 0.05) + Math.min(i, 8) * 0.07}
            />
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <motion.div
            className="col-span-full flex flex-col items-center rounded-[28px] bg-paper/50 px-6 py-14 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="mb-3 text-4xl" aria-hidden>
              🔎
            </span>
            <p className="font-display text-xl font-bold text-ink">No encontramos esa ocasión</p>
            <p className="mt-1 max-w-sm text-ink/60">
              Probá con otra palabra o mirá todas. ¿Buscás algo que no está? Contanos por el chat de
              ayuda.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setFilter('Todas')
              }}
              className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-ink/90"
            >
              Ver todas
            </button>
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  )
}

function GalleryCard({
  theme,
  plan,
  priority,
  delay,
}: {
  theme: GalleryTheme
  plan: string | null
  priority: boolean
  delay: number
}) {
  const href = `/tematicas/${theme.slug}${plan ? `?plan=${plan}` : ''}` as Route
  const example = `/ejemplo/${theme.slug}${plan ? `?plan=${plan}` : ''}` as Route
  return (
    <motion.article
      layout
      className="group relative flex flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_2px_10px_rgba(42,36,51,0.05)] ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-[0_24px_50px_rgba(42,36,51,0.14)]"
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
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper">
        <motion.div
          className="absolute inset-0"
          variants={{ show: { scale: 1 }, hover: { scale: 1.08 } }}
          transition={{ duration: 0.8, ease: ease.out }}
        >
          <Image
            src={theme.image}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            className="object-cover"
          />
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 font-display text-base font-bold text-ink shadow-md">
          {theme.priceLabel}
        </span>
        <motion.span
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur"
          variants={{
            show: { opacity: 0, scale: 0.6, rotate: -45 },
            hover: { opacity: 1, scale: 1, rotate: 0 },
          }}
          transition={spring.bouncy}
          aria-hidden
        >
          <ArrowUpRight className="size-5" />
        </motion.span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <span className="mb-1.5 text-xs font-extrabold tracking-wider text-brand uppercase">
          {theme.category}
        </span>
        <h2 className="flex items-center gap-2 font-display text-2xl leading-tight font-bold text-ink">
          {/* Toda la tarjeta es el link a la ficha. */}
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {theme.name}
          </Link>
          <span aria-hidden className="text-xl">
            {theme.emoji}
          </span>
        </h2>
        <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-ink/65">
          {theme.description}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-brand">Elegir esta Boxie →</span>
          {/* Encima del link de la tarjeta: lleva a la Boxie de ejemplo. */}
          <Link
            href={example}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-paper/70 px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            <Play className="size-3 fill-current" aria-hidden /> Ver ejemplo
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
