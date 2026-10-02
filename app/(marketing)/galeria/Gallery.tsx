'use client'

import { AnimatePresence, motion, useTransform } from 'framer-motion'
import {
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  MessageCircleHeart,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { searchSuggestions, sortLabels } from '@/content/gallery'
import {
  DEFAULT_GALLERY_STATE,
  GALLERY_SORTS,
  filterGallery,
  galleryCategories,
  galleryQueryString,
  matchesQuery,
  sortGallery,
  type GallerySort,
  type GalleryState,
  type GalleryView,
} from '@/domain/gallery'
import type { PublicSponsor } from '@/domain/sponsors'
import { Button, ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Icon } from '@/ui/Icon'
import { useCurrency } from '@/ui/currency/CurrencyContext'
import { Modal } from '@/ui/Modal'
import { Reveal, Swap, spring, useCalm } from '@/ui/motion'
import { NAVBAR_COMPACT_HEIGHT, navbarOffset } from '@/ui/navbar-offset'
import { SponsorTile } from '@/ui/sponsors/SponsorUnits'
import { openSupport, supportPageHref } from '@/ui/support-bridge'
import { GalleryCard } from './GalleryCard'
import { GalleryHeader } from './GalleryHeader'
import { GuidePicker } from './GuidePicker'
import { isTiered } from './helpers'
import { QuickView } from './QuickView'
import type { GalleryPlan, GallerySeason, GalleryTheme } from './types'

/**
 * La galería: buscador, "¿para quién?", plan, orden y vista, todo en la URL
 * (se puede compartir un link ya filtrado y el botón de volver lo respeta).
 * La barra de filtros se pega arriba mientras se recorre la grilla y se
 * acomoda debajo de la navegación cuando esta vuelve a aparecer.
 */
export function Gallery({
  themes,
  plans,
  recommendedPlan,
  priceFromCents,
  maxScreens,
  season,
  initial,
  sponsor,
}: {
  themes: GalleryTheme[]
  plans: GalleryPlan[]
  recommendedPlan: string | null
  priceFromCents: number
  maxScreens: number
  season: GallerySeason | null
  initial: GalleryState
  /** El aliado de la galería hoy; null: la invitación a sumarse. */
  sponsor: PublicSponsor | null
}) {
  const [state, setState] = useState(initial)
  const [quick, setQuick] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const query = useDeferredValue(state.query)
  const results = useRef<HTMLDivElement>(null)
  const calm = useCalm()
  // La primera vez las tarjetas esperan a que termine de entrar el título.
  const [firstLoad, setFirstLoad] = useState(true)

  const update = (patch: Partial<GalleryState>) => {
    setFirstLoad(false)
    setState((s) => ({ ...s, ...patch }))
  }

  // El estado viaja en la URL (sin sumar una entrada al historial por cada tecla).
  const url = galleryQueryString(state)
  useEffect(() => {
    if (window.location.search === url) return
    window.history.replaceState(null, '', `${window.location.pathname}${url}`)
  }, [url])

  const categories = useMemo(() => {
    // Cuántas hay en cada categoría con lo que está buscado.
    const found = galleryCategories(filterGallery(themes, { query, category: null }))
    return galleryCategories(themes).map((c) => ({
      name: c.name,
      count: found.find((f) => f.name === c.name)?.count ?? 0,
    }))
  }, [themes, query])
  const matching = categories.reduce((sum, c) => sum + c.count, 0)

  const visible = useMemo(
    () => sortGallery(filterGallery(themes, { query, category: state.category }), state.sort),
    [themes, query, state.category, state.sort],
  )

  // Al buscar desde la barra pegada, la grilla vuelve a verse desde el principio.
  useEffect(() => {
    scrollToResults(results.current, !calm)
  }, [query, calm])

  const choose = (patch: Partial<GalleryState>) => {
    update(patch)
    requestAnimationFrame(() => scrollToResults(results.current, !calm))
  }

  const clearAll = () =>
    choose({ query: '', category: null, sort: DEFAULT_GALLERY_STATE.sort, plan: null })
  const filtered = state.query.trim() !== '' || state.category !== null
  // El espacio del aliado va después de la tercera temática (o al final), solo sin filtros:
  // no se mezcla con lo que alguien buscó. Con menos de tres, al final (índice fuera de rango).
  const sponsorAt = filtered ? -1 : Math.min(3, visible.length)
  const sponsorCard = (i: number) => (
    <motion.li
      key="aliado"
      layout="position"
      className="list-none"
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { ...spring.soft, delay: (firstLoad ? 0.35 : 0.03) + Math.min(i, 8) * 0.06 },
      }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
    >
      <SponsorTile sponsor={sponsor} compact={state.view === 'compacta'} />
    </motion.li>
  )
  const tiered = isTiered(plans)
  const chosenPlan = plans.find((p) => p.slug === state.plan)

  return (
    <div className="overflow-x-clip bg-white">
      <GalleryHeader
        themes={themes}
        maxScreens={maxScreens}
        plans={plans}
        plan={state.plan}
        season={season}
        onQuickView={setQuick}
      />

      {/* La barra se pega solo mientras se recorre la grilla (este contenedor). */}
      <div>
        <Toolbar
          query={state.query}
          onQuery={(q) => update({ query: q })}
          suggestions={searchSuggestions.filter((s) => themes.some((t) => matchesQuery(t, s)))}
          categories={categories}
          total={matching}
          category={state.category}
          onCategory={(category) => choose({ category })}
          onOpenFilters={() => setSheet(true)}
          activeFilters={
            (state.category ? 1 : 0) +
            (state.plan ? 1 : 0) +
            (state.sort !== 'recomendadas' ? 1 : 0)
          }
        />

        <div
          ref={results}
          className="mx-auto max-w-6xl scroll-mt-[150px] px-4 pt-5 pb-16 sm:px-8 md:scroll-mt-[160px]"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-sm text-ink/60" aria-live="polite">
                <strong className="font-display text-base text-ink">
                  <Swap id={visible.length}>{visible.length}</Swap>
                </strong>{' '}
                {visible.length === 1 ? 'temática' : 'temáticas'}
                {filtered && ` de ${themes.length}`}
              </p>
              <AnimatePresence initial={false}>
                {state.query.trim() && (
                  <Token key="q" onRemove={() => choose({ query: '' })} label="Quitar la búsqueda">
                    “{state.query.trim()}”
                  </Token>
                )}
                {state.category && (
                  <Token
                    key="categoria"
                    onRemove={() => choose({ category: null })}
                    label="Quitar la categoría"
                  >
                    {state.category}
                  </Token>
                )}
                {chosenPlan && (
                  <Token
                    key="plan"
                    onRemove={() => choose({ plan: null })}
                    label="Quitar el plan"
                    className="md:hidden"
                  >
                    Plan {chosenPlan.name}
                  </Token>
                )}
                {(filtered || state.plan) && (
                  <motion.button
                    key="limpiar"
                    type="button"
                    onClick={clearAll}
                    className="text-sm font-bold text-brand underline-offset-4 hover:underline"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Limpiar
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              {tiered && (
                <PlanSwitch
                  className="hidden md:flex"
                  plans={plans}
                  plan={state.plan}
                  onPlan={(plan) => update({ plan })}
                  priceFromCents={priceFromCents}
                />
              )}
              <SortSelect
                className="hidden md:block"
                sort={state.sort}
                onSort={(sort) => choose({ sort })}
              />
              <ViewSwitch view={state.view} onView={(view) => update({ view })} />
            </div>
          </div>

          <motion.ul
            key={state.view}
            className={cn(
              'relative grid',
              state.view === 'grande'
                ? 'grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3'
                : 'grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4',
            )}
          >
            <AnimatePresence mode="popLayout">
              {visible.flatMap((theme, i) => [
                ...(i === sponsorAt ? [sponsorCard(i)] : []),
                <GalleryCard
                  key={theme.id}
                  theme={theme}
                  view={state.view}
                  plans={plans}
                  plan={state.plan}
                  priceFromCents={priceFromCents}
                  priority={i < 3}
                  delay={(firstLoad ? 0.35 : 0.03) + Math.min(i, 8) * 0.06}
                  onQuickView={setQuick}
                />,
              ])}
              {sponsorAt === visible.length && visible.length > 0 && sponsorCard(visible.length)}
            </AnimatePresence>
          </motion.ul>

          <AnimatePresence>
            {visible.length === 0 && (
              <motion.div
                className="flex flex-col items-center rounded-[32px] bg-paper/40 px-6 py-14 text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring.soft}
              >
                <motion.span
                  className="mb-3"
                  aria-hidden
                  animate={calm ? undefined : { rotate: [0, -12, 12, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
                >
                  <Icon name="buscar" size={60} />
                </motion.span>
                <p className="font-display text-2xl font-bold text-ink">
                  No encontramos esa ocasión
                </p>
                <p className="mt-2 max-w-md text-ink/60">
                  Probá con otra palabra o mirá todas. Y si la temática que buscás no existe,
                  contanos: las nuevas salen de lo que nos piden.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="dark" onClick={clearAll}>
                    Ver todas
                  </Button>
                  <RequestButton query={state.query} variant="secondary" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <GuidePicker themes={themes} plan={state.plan} onQuickView={setQuick} />

      <section className="px-4 pb-24 sm:px-8">
        <Reveal className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 overflow-hidden rounded-[40px] bg-ink px-6 py-12 text-center text-white sm:px-12 md:flex-row md:text-left">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-10 size-72 rounded-full bg-brand/40 blur-3xl"
          />
          <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Icon name="idea" size={40} />
          </span>
          <div className="relative flex-1">
            <h2 className="font-display text-2xl leading-tight font-bold text-balance sm:text-3xl">
              ¿No está la ocasión que buscás?
            </h2>
            <p className="mt-2 text-white/70">
              Contanos para quién es y qué querés festejar. Las temáticas nuevas salen de lo que nos
              piden.
            </p>
          </div>
          <RequestButton query={state.query} variant="white" className="relative" />
        </Reveal>
      </section>

      <QuickView
        themes={visible.some((t) => t.slug === quick) ? visible : themes}
        slug={quick}
        onSlug={setQuick}
        onClose={() => setQuick(null)}
        plans={plans}
        plan={state.plan}
        onPlan={(plan) => update({ plan })}
        recommendedPlan={recommendedPlan}
        priceFromCents={priceFromCents}
      />

      <FilterSheet
        open={sheet}
        onOpenChange={setSheet}
        state={state}
        categories={categories}
        total={matching}
        plans={plans}
        priceFromCents={priceFromCents}
        visibleCount={visible.length}
        onChange={update}
        onClear={clearAll}
      />
    </div>
  )
}

/** Si el principio de la grilla quedó arriba de la pantalla (se filtró más abajo), vuelve a él. */
function scrollToResults(el: HTMLElement | null, smooth: boolean) {
  if (!el || el.getBoundingClientRect().top > 0) return
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
}

// ── Barra de filtros ───────────────────────────────────────────────────────

interface Category {
  name: string
  count: number
}

function Toolbar({
  query,
  onQuery,
  suggestions,
  categories,
  total,
  category,
  onCategory,
  onOpenFilters,
  activeFilters,
}: {
  query: string
  onQuery(q: string): void
  suggestions: string[]
  categories: Category[]
  total: number
  category: string | null
  onCategory(category: string | null): void
  onOpenFilters(): void
  activeFilters: number
}) {
  // Pegada debajo de la navegación; si la navegación se esconde, sube.
  const top = useTransform(navbarOffset, [-110, 0], [10, NAVBAR_COMPACT_HEIGHT + 8])

  return (
    <>
      <motion.div className="sticky z-40 px-3 sm:px-8" style={{ top }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 rounded-[26px] bg-white/85 p-2 shadow-[0_12px_40px_-12px_rgba(42,36,51,0.22)] ring-1 ring-black/[0.06] backdrop-blur-xl backdrop-saturate-150">
          <SearchBox
            query={query}
            onQuery={onQuery}
            suggestions={suggestions}
            className="min-w-0 flex-1 md:max-w-[260px] xl:max-w-[300px]"
          />
          <CategoryChips
            id="barra"
            className="hidden min-w-0 flex-1 md:flex"
            categories={categories}
            total={total}
            category={category}
            onCategory={onCategory}
          />
          <button
            type="button"
            onClick={onOpenFilters}
            className="relative flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white md:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros
            <AnimatePresence>
              {activeFilters > 0 && (
                <motion.span
                  className="grid size-5 place-items-center rounded-full bg-brand text-[0.7rem] font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={spring.bouncy}
                >
                  {activeFilters}
                  <span className="sr-only"> filtros activos</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* En el celular las categorías van debajo, deslizables. */}
      <CategoryChips
        id="celular"
        className="mt-3 flex px-4 md:hidden"
        categories={categories}
        total={total}
        category={category}
        onCategory={onCategory}
      />
    </>
  )
}

/**
 * El buscador: sugiere ocasiones mientras está vacío, se borra con la cruz y
 * se enfoca con "/" desde cualquier parte de la página.
 */
function SearchBox({
  query,
  onQuery,
  suggestions,
  className,
}: {
  query: string
  onQuery(q: string): void
  suggestions: string[]
  className?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [hint, setHint] = useState(0)
  const calm = useCalm()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.key !== '/' || target?.closest('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Mientras está vacío, el ejemplo va cambiando ("aniversario", "mamá"…).
  const idle = !query && !focused && suggestions.length > 1 && !calm
  useEffect(() => {
    if (!idle) return
    const id = window.setInterval(() => setHint((h) => (h + 1) % suggestions.length), 2600)
    return () => window.clearInterval(id)
  }, [idle, suggestions.length])

  const example = suggestions[hint % Math.max(suggestions.length, 1)]?.toLowerCase()
  const open = focused && !query && suggestions.length > 0

  return (
    <div className={cn('relative', className)}>
      <label className="relative block">
        <span className="sr-only">Buscar una temática por ocasión o por nombre</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/40"
          aria-hidden
        />
        <input
          ref={input}
          type="search"
          value={query}
          maxLength={60}
          enterKeyHint="search"
          autoComplete="off"
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            onQuery('')
            input.current?.blur()
          }}
          className="h-11 w-full rounded-full bg-paper/50 pr-10 pl-11 text-base text-ink transition-[background-color,box-shadow] outline-none placeholder:text-ink/40 hover:bg-paper/70 focus:bg-white focus:shadow-[0_0_0_2px_rgb(244_78_99/0.45)] [&::-webkit-search-cancel-button]:hidden"
          placeholder={example ? '' : 'Buscá una ocasión'}
        />
        {!query && example && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-10 left-11 flex items-center overflow-hidden text-base whitespace-nowrap text-ink/40"
          >
            Buscá&nbsp;“<Swap id={example}>{example}</Swap>”
          </span>
        )}
        {query ? (
          <button
            type="button"
            onClick={() => {
              onQuery('')
              input.current?.focus()
            }}
            aria-label="Borrar la búsqueda"
            className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink/50 hover:bg-paper hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-black/10 bg-white px-1.5 font-sans text-xs text-ink/40 lg:block">
            /
          </kbd>
        )}
      </label>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute inset-x-0 top-[calc(100%+10px)] z-10 min-w-[260px] rounded-3xl bg-white p-4 shadow-[0_24px_50px_-12px_rgba(42,36,51,0.3)] ring-1 ring-black/5"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={spring.snappy}
          >
            <p className="mb-2.5 text-xs font-extrabold tracking-wider text-ink/45 uppercase">
              Probá con
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  // mousedown: que no se pierda el foco (y se cierre) antes del click.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onQuery(s)}
                  className="rounded-full bg-paper/60 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-brand hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CategoryChips({
  id,
  categories,
  total,
  category,
  onCategory,
  className,
}: {
  /** Hay dos (en la barra y, en el celular, debajo): cada una con su resaltado. */
  id: string
  categories: Category[]
  total: number
  category: string | null
  onCategory(category: string | null): void
  className?: string
}) {
  if (categories.length < 2) return null
  const all = [
    { name: null, label: 'Todas', count: total },
    ...categories.map((c) => ({ ...c, label: c.name })),
  ]
  return (
    <div
      role="group"
      aria-label="¿Para quién es?"
      className={cn(
        '[scrollbar-width:none] gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden',
        // Un degradé a la derecha avisa que hay más para deslizar.
        '[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]',
        className,
      )}
    >
      {all.map((c) => {
        const selected = category === c.name
        return (
          <motion.button
            key={c.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onCategory(c.name)}
            className={cn(
              'relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors duration-200 last:mr-6',
              selected ? 'text-white' : 'text-ink/70 hover:bg-paper/60 hover:text-ink',
              !selected && c.count === 0 && 'opacity-45',
            )}
            whileTap={{ scale: 0.95 }}
            transition={spring.snappy}
          >
            {selected && (
              <motion.span
                layoutId={`galeria-categoria-${id}`}
                className="absolute inset-0 rounded-full bg-brand shadow-[0_6px_18px_rgb(244_78_99/0.35)]"
                transition={spring.snappy}
                aria-hidden
              />
            )}
            <span className="relative">{c.label}</span>
            <span
              className={cn(
                'relative min-w-5 rounded-full px-1.5 text-center text-[0.7rem] font-bold tabular-nums',
                selected ? 'bg-white/25 text-white' : 'bg-paper/80 text-ink/55',
              )}
            >
              {c.count}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

function SortSelect({
  sort,
  onSort,
  className,
}: {
  sort: GallerySort
  onSort(sort: GallerySort): void
  className?: string
}) {
  return (
    <label className={cn('relative shrink-0', className)}>
      <span className="sr-only">Ordenar</span>
      <ArrowUpDown
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink/50"
        aria-hidden
      />
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as GallerySort)}
        className="h-11 cursor-pointer appearance-none rounded-full bg-paper/40 pr-9 pl-10 text-sm font-semibold text-ink outline-none hover:bg-paper/70 focus-visible:shadow-[0_0_0_2px_rgb(244_78_99/0.45)]"
      >
        {GALLERY_SORTS.map((s) => (
          <option key={s} value={s}>
            {sortLabels[s]}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink/50"
        aria-hidden
      />
    </label>
  )
}

/** El precio de cada plan, a la vista: cambiarlo actualiza todas las tarjetas. */
function PlanSwitch({
  plans,
  plan,
  onPlan,
  priceFromCents,
  className,
}: {
  plans: GalleryPlan[]
  plan: string | null
  onPlan(plan: string | null): void
  priceFromCents: number
  className?: string
}) {
  const { formatPrice } = useCurrency()
  const options = [
    { slug: null, name: 'Todos', price: `desde ${formatPrice(priceFromCents)}` },
    ...plans.map((p) => ({ slug: p.slug, name: p.name, price: formatPrice(p.priceCents) })),
  ]
  return (
    <div
      role="group"
      aria-label="Precio según el plan"
      className={cn('items-center gap-1 rounded-full bg-paper/40 p-1', className)}
    >
      {options.map((o) => {
        const selected = plan === o.slug
        return (
          <button
            key={o.name}
            type="button"
            aria-pressed={selected}
            onClick={() => onPlan(o.slug)}
            className={cn(
              'relative rounded-full px-3.5 py-1.5 text-left transition-colors',
              selected ? 'text-white' : 'text-ink/70 hover:text-ink',
            )}
          >
            {selected && (
              <motion.span
                layoutId="galeria-plan"
                className="absolute inset-0 rounded-full bg-ink"
                transition={spring.snappy}
                aria-hidden
              />
            )}
            <span className="relative block text-[0.8rem] leading-tight font-bold">{o.name}</span>
            <span
              className={cn(
                'relative block text-[0.7rem] leading-tight',
                selected ? 'text-white/65' : 'text-ink/45',
              )}
            >
              {o.price}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ViewSwitch({ view, onView }: { view: GalleryView; onView(view: GalleryView): void }) {
  const options = [
    { id: 'grande' as const, label: 'Tarjetas grandes', Icon: Rows3 },
    { id: 'compacta' as const, label: 'Mosaico', Icon: LayoutGrid },
  ]
  return (
    <div role="group" aria-label="Vista" className="flex gap-1 rounded-full bg-paper/40 p-1">
      {options.map(({ id, label, Icon }) => {
        const selected = view === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            aria-label={label}
            title={label}
            onClick={() => onView(id)}
            className={cn(
              'relative grid size-9 place-items-center rounded-full transition-colors',
              selected ? 'text-ink' : 'text-ink/45 hover:text-ink',
            )}
          >
            {selected && (
              <motion.span
                layoutId="galeria-vista"
                className="absolute inset-0 rounded-full bg-white shadow-sm"
                transition={spring.snappy}
                aria-hidden
              />
            )}
            <Icon className="relative size-4" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

function Token({
  children,
  onRemove,
  label,
  className,
}: {
  children: ReactNode
  onRemove(): void
  label: string
  className?: string
}) {
  return (
    <motion.span
      layout
      className={cn(
        'inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-brand-soft py-1 pr-1 pl-3 text-sm font-semibold text-brand-dark',
        className,
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
      transition={spring.snappy}
    >
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-brand/15"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </motion.span>
  )
}

/** "Pedinos una temática": abre el chat con el pedido escrito (o va a /soporte). */
function RequestButton({
  query,
  variant,
  className,
}: {
  query: string
  variant: 'white' | 'secondary'
  className?: string
}) {
  const wanted = query.trim()
  const message = wanted
    ? `¡Hola! Busqué "${wanted}" en la galería y no encontré una Boxie. ¿La pueden sumar?`
    : '¡Hola! Me gustaría una Boxie para esta ocasión: '
  return (
    <ButtonLink
      href={supportPageHref({ topic: 'otro', message })}
      variant={variant}
      size="md"
      className={className}
      onClick={(e) => {
        if (openSupport({ topic: 'otro', message })) e.preventDefault()
      }}
    >
      <MessageCircleHeart className="size-4 text-brand" aria-hidden /> Pedir una temática
    </ButtonLink>
  )
}

// ── Filtros en el celular ─────────────────────────────────────────────────

function FilterSheet({
  open,
  onOpenChange,
  state,
  categories,
  total,
  plans,
  priceFromCents,
  visibleCount,
  onChange,
  onClear,
}: {
  open: boolean
  onOpenChange(open: boolean): void
  state: GalleryState
  categories: Category[]
  total: number
  plans: GalleryPlan[]
  priceFromCents: number
  visibleCount: number
  onChange(patch: Partial<GalleryState>): void
  onClear(): void
}) {
  const { formatPrice } = useCurrency()
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Filtrá las Boxies">
      <div className="mt-6 space-y-7 text-left">
        {categories.length > 1 && (
          <SheetGroup title="¿Para quién es?">
            <div className="flex flex-wrap gap-2">
              {[{ name: null, count: total }, ...categories].map((c) => (
                <Choice
                  key={c.name ?? 'todas'}
                  selected={state.category === c.name}
                  onClick={() => onChange({ category: c.name })}
                  disabled={c.count === 0}
                >
                  {c.name ?? 'Todas'} <span className="opacity-60">{c.count}</span>
                </Choice>
              ))}
            </div>
          </SheetGroup>
        )}

        {isTiered(plans) && (
          <SheetGroup title="Precio según el plan">
            <div className="grid gap-2">
              {[
                {
                  slug: null,
                  name: 'Sin elegir',
                  price: `Desde ${formatPrice(priceFromCents)}`,
                  note: '',
                },
                ...plans.map((p) => ({
                  slug: p.slug,
                  name: p.name,
                  price: formatPrice(p.priceCents),
                  note: p.tagline,
                })),
              ].map((p) => {
                const selected = state.plan === p.slug
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ plan: p.slug })}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-colors',
                      selected ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-black/10',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{p.name}</span>
                      {p.note && (
                        <span
                          className={cn(
                            'block truncate text-xs',
                            selected ? 'text-white/60' : 'text-ink/50',
                          )}
                        >
                          {p.note}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-display font-bold">{p.price}</span>
                  </button>
                )
              })}
            </div>
          </SheetGroup>
        )}

        <SheetGroup title="Ordenar">
          <div className="flex flex-wrap gap-2">
            {GALLERY_SORTS.map((s) => (
              <Choice key={s} selected={state.sort === s} onClick={() => onChange({ sort: s })}>
                {sortLabels[s]}
              </Choice>
            ))}
          </div>
        </SheetGroup>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClear}
            className="px-2 text-sm font-bold text-ink/60 underline-offset-4 hover:text-ink hover:underline"
          >
            Limpiar
          </button>
          <Button type="button" className="min-w-0 flex-1" onClick={() => onOpenChange(false)}>
            Ver {visibleCount} {visibleCount === 1 ? 'temática' : 'temáticas'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function SheetGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-extrabold tracking-wider text-ink/45 uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function Choice({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean
  onClick(): void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled && !selected}
      className={cn(
        'h-10 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-40',
        selected ? 'bg-brand text-white' : 'bg-paper/60 text-ink hover:bg-paper',
      )}
    >
      {children}
    </button>
  )
}
