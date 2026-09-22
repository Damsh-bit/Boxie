import Image from 'next/image'
import Link from 'next/link'
import type { CatalogTheme } from '@/domain/catalog'
import { cn } from './cn'

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
    <Link
      href={`/tematicas/${theme.slug}`}
      className="group flex min-h-[424px] w-[304px] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:-translate-y-1"
      style={{ backgroundColor: theme.listing.cardColor, borderColor: theme.listing.cardColor }}
    >
      <div className="relative h-[296px] w-full overflow-hidden">
        <Image
          src={theme.listing.images[0]!}
          alt={theme.name}
          fill
          sizes="304px"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-6 text-left">
        <h3 className="mb-2 font-display text-[32px] leading-tight font-bold text-ink">
          {theme.name}
        </h3>
        <p className={cn('text-base', light ? 'text-paper' : 'text-ink')}>
          {theme.listing.cardDescription || theme.description}
        </p>
      </div>
    </Link>
  )
}
