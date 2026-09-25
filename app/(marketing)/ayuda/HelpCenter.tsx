'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircleHeart, Search, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import type { HelpCategory } from '@/content/help'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'
import { SupportButton } from '@/ui/SupportButton'
import { Faq } from './Faq'

/** Sin tildes ni mayúsculas: "clave" encuentra "Clave", "envio" encuentra "envío". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * Las preguntas del centro de ayuda: un buscador que filtra todas a la vez y
 * un índice por tema (en la computadora queda fijo al costado). Todo el
 * contenido está en el HTML: el índice solo lleva a cada sección.
 */
export function HelpCenter({ categories }: { categories: HelpCategory[] }) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const words = fold(deferred).split(/\s+/).filter(Boolean)

  const filtered = categories
    .map((c) => ({
      ...c,
      items: words.length
        ? c.items.filter((i) => {
            const text = fold(`${i.question} ${i.answer}`)
            return words.every((w) => text.includes(w))
          })
        : c.items,
    }))
    .filter((c) => c.items.length > 0)
  const total = filtered.reduce((n, c) => n + c.items.length, 0)

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 sm:px-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <label className="relative block">
          <span className="sr-only">Buscar en la ayuda</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/40"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá: clave, fotos, pago…"
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

        <nav
          aria-label="Temas de ayuda"
          className="-mx-5 mt-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((c) => {
            const count = filtered.find((f) => f.id === c.id)?.items.length ?? 0
            return (
              <a
                key={c.id}
                href={`#tema-${c.id}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/5 transition-colors hover:bg-brand-soft hover:text-brand lg:rounded-xl lg:bg-transparent lg:px-3 lg:ring-0',
                  words.length > 0 && count === 0 && 'opacity-40',
                )}
              >
                <span aria-hidden>{c.emoji}</span>
                {c.title}
                {words.length > 0 && (
                  <span className="ml-auto rounded-full bg-paper px-1.5 text-xs text-ink/60 tabular-nums">
                    {count}
                  </span>
                )}
              </a>
            )
          })}
        </nav>

        <div className="mt-6 hidden rounded-3xl bg-ink p-5 text-white lg:block">
          <MessageCircleHeart className="mb-3 size-7 text-brand-muted" aria-hidden />
          <p className="font-display text-lg font-bold">¿No está tu pregunta?</p>
          <p className="mt-1 text-sm text-white/65">
            Abrí el chat y te responde una persona del equipo.
          </p>
          <SupportButton size="sm" className="mt-4 w-full">
            Abrir el chat de ayuda
          </SupportButton>
        </div>
      </aside>

      <div className="min-w-0">
        <p className="sr-only" aria-live="polite">
          {words.length ? (total === 1 ? 'Una respuesta' : `${total} respuestas`) : ''}
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.map((c) => (
            <motion.section
              key={c.id}
              id={`tema-${c.id}`}
              aria-labelledby={`tema-${c.id}-title`}
              className="mb-12 scroll-mt-28 last:mb-0"
              layout="position"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={spring.soft}
            >
              <h2
                id={`tema-${c.id}-title`}
                className="mb-4 flex items-center gap-2.5 font-display text-2xl font-bold text-ink"
              >
                <span aria-hidden>{c.emoji}</span> {c.title}
              </h2>
              <Faq key={`${c.id}-${deferred}`} items={c.items} />
            </motion.section>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            className="flex flex-col items-center rounded-[28px] bg-white px-6 py-14 text-center ring-1 ring-black/5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="mb-3 text-4xl" aria-hidden>
              🔎
            </span>
            <p className="font-display text-xl font-bold text-ink">No encontramos esa respuesta</p>
            <p className="mt-1 max-w-sm text-ink/60">
              Probá con otras palabras, o preguntanos directamente: te responde una persona.
            </p>
            <SupportButton className="mt-5" detail={{ message: query }}>
              Preguntar por el chat
            </SupportButton>
          </motion.div>
        )}
      </div>
    </div>
  )
}
