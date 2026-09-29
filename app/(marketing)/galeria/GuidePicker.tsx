'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Eye } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, type KeyboardEvent } from 'react'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'
import { Mark, SectionHeading } from '../_home/primitives'
import { themeHref } from './helpers'
import type { GalleryTheme } from './types'

/**
 * "¿Qué Boxie elegir?": cada temática con su guía (la del panel) es una
 * pestaña; al elegirla se ve para qué momento va, sus ocasiones y la foto.
 * En el celular las pestañas se deslizan de costado.
 */
export function GuidePicker({
  themes,
  plan,
  onQuickView,
}: {
  themes: GalleryTheme[]
  plan: string | null
  onQuickView(slug: string): void
}) {
  const guides = themes.filter((t) => t.guide)
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  if (guides.length === 0) return null
  const current = guides[Math.min(active, guides.length - 1)]!
  const guide = current.guide!

  // Flechas del teclado entre pestañas (como un tablist de verdad).
  const onKeyDown = (e: KeyboardEvent) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!delta) return
    e.preventDefault()
    const next = (active + delta + guides.length) % guides.length
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <section
      aria-labelledby="elegir-title"
      className="mt-8 rounded-t-[40px] bg-gradient-to-b from-paper/70 to-white px-5 pt-20 pb-20 sm:px-8"
    >
      <SectionHeading
        eyebrow="¿Dudás entre dos?"
        title={
          <span id="elegir-title">
            Cada momento tiene <Mark>su Ribbly</Mark>
          </span>
        }
        text="Contanos qué querés festejar y te mostramos la que mejor le va."
      />

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[320px_1fr] lg:gap-10">
        <div
          role="tablist"
          aria-label="Momentos"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 lg:flex-col lg:flex-nowrap [&::-webkit-scrollbar]:hidden"
        >
          {guides.map((t, i) => {
            const selected = i === active
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`guia-${t.slug}`}
                aria-selected={selected}
                aria-controls="guia-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={cn(
                  'relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-200 lg:rounded-3xl lg:px-5 lg:py-4',
                  selected
                    ? 'text-white'
                    : 'bg-white/80 text-ink ring-1 ring-black/5 hover:bg-white',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="guia-activa"
                    className="absolute inset-0 rounded-2xl bg-ink shadow-[0_14px_30px_-12px_rgba(42,36,51,0.55)] lg:rounded-3xl"
                    transition={spring.snappy}
                    aria-hidden
                  />
                )}
                <motion.span
                  className="relative text-2xl lg:text-3xl"
                  aria-hidden
                  animate={selected ? { rotate: [0, -14, 10, 0], scale: [1, 1.25, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {t.guide!.emoji}
                </motion.span>
                <span className="relative">
                  <span className="block font-display text-[1.05rem] leading-tight font-bold lg:text-lg">
                    {t.guide!.title}
                  </span>
                  <span
                    className={cn(
                      'block text-xs font-semibold',
                      selected ? 'text-white/60' : 'text-ink/50',
                    )}
                  >
                    Ribbly {t.name}
                  </span>
                </span>
                {selected && (
                  <ArrowRight
                    className="relative ml-auto hidden size-5 text-brand-muted lg:block"
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>

        <div
          id="guia-panel"
          role="tabpanel"
          aria-labelledby={`guia-${current.slug}`}
          className="relative"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.slug}
              className="grid overflow-hidden rounded-[32px] bg-white shadow-[0_24px_60px_-28px_rgba(42,36,51,0.35)] ring-1 ring-black/5 sm:grid-cols-[1fr_1.1fr]"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ duration: 0.4, ease: ease.out }}
            >
              <div
                className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[340px]"
                style={{ backgroundColor: current.color }}
              >
                {(current.images[1] ?? current.images[0]) && (
                  <motion.div
                    className="absolute inset-0"
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.1, ease: ease.out }}
                  >
                    <Image
                      src={(current.images[1] ?? current.images[0])!}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 420px"
                      className="object-cover"
                    />
                  </motion.div>
                )}
                <motion.span
                  className="absolute bottom-4 left-4 grid size-16 place-items-center rounded-2xl bg-white text-4xl shadow-lg"
                  initial={{ scale: 0, rotate: -25 }}
                  animate={{ scale: 1, rotate: -6 }}
                  transition={{ ...spring.bouncy, delay: 0.15 }}
                  aria-hidden
                >
                  {guide.emoji}
                </motion.span>
              </div>
              <div className="flex flex-col p-6 sm:p-8">
                <span className="text-xs font-extrabold tracking-wider text-brand uppercase">
                  {current.category}
                </span>
                <h3 className="mt-1 font-display text-3xl leading-tight font-bold text-ink">
                  {guide.title}
                </h3>
                <p className="mt-3 leading-relaxed text-ink/70">{guide.text}</p>
                {current.occasions.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-1.5">
                    {current.occasions.map((o, i) => (
                      <motion.li
                        key={o}
                        className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-dark"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring.snappy, delay: 0.2 + i * 0.05 }}
                      >
                        {o}
                      </motion.li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-7">
                  <ButtonLink href={themeHref(current.slug, plan)} size="md">
                    Elegir {current.name}
                  </ButtonLink>
                  <button
                    type="button"
                    onClick={() => onQuickView(current.slug)}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-paper/70 px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
                  >
                    <Eye className="size-4" aria-hidden /> Vista rápida
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
