'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { categoriesOf, type CatalogTheme } from '@/domain/catalog'
import { cn } from '@/ui/cn'

export function GalleryGrid({ themes }: { themes: CatalogTheme[] }) {
  const [filter, setFilter] = useState('Todos')
  const categories = ['Todos', ...categoriesOf(themes)]
  const visible = filter === 'Todos' ? themes : themes.filter((t) => t.category === filter)

  return (
    <>
      <div
        className="mb-12 flex animate-fade-in-up flex-wrap justify-center gap-2.5 px-5"
        role="group"
        aria-label="Filtrar por categoría"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={filter === cat}
            onClick={() => setFilter(cat)}
            className={cn(
              'rounded-full px-6 py-2.5 text-[0.95rem] font-medium transition-all hover:-translate-y-0.5',
              filter === cat
                ? 'bg-brand text-white shadow-[0_5px_15px_rgb(244_78_99/0.3)]'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 pb-20 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
        {visible.map((theme) => (
          <article
            key={theme.id}
            className="group animate-fade-in-up overflow-hidden rounded-[20px] border border-neutral-100 bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)]"
          >
            <div className="relative h-[250px] w-full overflow-hidden sm:h-[280px]">
              <Image
                src={theme.listing.images[1] ?? theme.listing.images[0]!}
                alt={theme.name}
                fill
                sizes="(max-width: 640px) 100vw, 380px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100">
                <Link
                  href={`/tematicas/${theme.slug}`}
                  className="translate-y-5 rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition-all duration-300 group-focus-within:translate-y-0 group-hover:translate-y-0 hover:bg-brand hover:text-white"
                >
                  Ver Boxie
                </Link>
              </div>
            </div>
            <div className="p-5">
              <span className="mb-2 block text-xs font-extrabold tracking-wider text-brand uppercase">
                {theme.category}
              </span>
              <h3 className="mb-2 text-2xl font-semibold text-neutral-900">
                <Link
                  href={`/tematicas/${theme.slug}`}
                  className="after:absolute after:inset-0 md:after:hidden"
                >
                  {theme.name}
                </Link>
              </h3>
              <p className="text-[0.95rem] leading-relaxed text-neutral-500">
                {theme.listing.cardDescription || theme.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
