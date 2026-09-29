'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, MapPin, Sparkles, TicketPercent } from 'lucide-react'
import Link from 'next/link'
import { houseAd, industries } from '@/content/brands'
import type { PublicSponsor } from '@/domain/sponsors'
import { cn } from '../cn'
import { Float, spring } from '../motion'

/**
 * Los espacios de sponsor del sitio. Con un aliado activo en ese lugar se ve
 * su propuesta (con la etiqueta "Aliado de Ribbly", para que se entienda que
 * es publicidad); sin aliado, la invitación a sumarse (/marcas).
 */

/** El logo del aliado, o su emoji sobre su color. */
export function SponsorMark({
  sponsor,
  size = 56,
  className,
}: {
  sponsor: Pick<PublicSponsor, 'name' | 'emoji' | 'logoUrl' | 'color'>
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-2xl shadow-[0_8px_20px_-8px_rgba(42,36,51,0.35)] ring-2 ring-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, color-mix(in srgb, ${sponsor.color} 70%, white), ${sponsor.color})`,
      }}
    >
      {sponsor.logoUrl ? (
        // Logos de cualquier sitio (Instagram, su web): sin next/image, que necesita cada dominio declarado.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sponsor.logoUrl}
          alt={sponsor.name}
          className="size-full bg-white object-contain p-1.5"
          loading="lazy"
        />
      ) : (
        <span aria-hidden style={{ fontSize: Math.round(size * 0.48) }}>
          {sponsor.emoji}
        </span>
      )}
    </span>
  )
}

function SponsorLabel({ light = false }: { light?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold tracking-[0.14em] uppercase',
        light ? 'bg-white/15 text-white' : 'bg-ink/[0.06] text-ink/60',
      )}
    >
      <Sparkles className="size-3" aria-hidden /> Aliado de Ribbly
    </span>
  )
}

/** El link del aliado: afuera, marcado como patrocinado. Sin link, a los aliados de /marcas. */
function sponsorLink(sponsor: PublicSponsor) {
  return sponsor.url
    ? { href: sponsor.url, external: true as const }
    : { href: '/marcas#aliados', external: false as const }
}

// ── Tarjeta (entre las temáticas de la galería) ───────────────────────────

export function SponsorTile({
  sponsor,
  compact = false,
}: {
  sponsor: PublicSponsor | null
  compact?: boolean
}) {
  return sponsor ? (
    <SponsorTileLive sponsor={sponsor} compact={compact} />
  ) : (
    <HouseTile compact={compact} />
  )
}

function SponsorTileLive({ sponsor, compact }: { sponsor: PublicSponsor; compact: boolean }) {
  const link = sponsorLink(sponsor)
  return (
    <motion.article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden bg-white ring-1 ring-black/[0.06] transition-shadow duration-300 hover:shadow-[0_30px_60px_-20px_var(--glow)]',
        compact ? 'rounded-[22px]' : 'rounded-[28px]',
      )}
      style={{ ['--glow' as string]: `color-mix(in srgb, ${sponsor.color} 55%, transparent)` }}
      initial="rest"
      animate="rest"
      whileHover="hover"
      variants={{ rest: { y: 0 }, hover: { y: compact ? -4 : -8 } }}
      transition={spring.soft}
    >
      <div
        className={cn(
          'relative flex flex-col justify-between overflow-hidden p-4 text-white',
          compact ? 'aspect-square' : 'aspect-[4/3] p-5',
        )}
        style={{
          background: `radial-gradient(circle at 80% 10%, color-mix(in srgb, ${sponsor.color} 55%, white) 0%, ${sponsor.color} 45%, color-mix(in srgb, ${sponsor.color} 65%, #2a2433) 100%)`,
        }}
      >
        <SponsorLabel light />
        <motion.span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-4 -bottom-6 opacity-25 select-none',
            compact ? 'text-[6rem]' : 'text-[9rem]',
          )}
          variants={{ rest: { rotate: -8, scale: 1 }, hover: { rotate: 4, scale: 1.08 } }}
          transition={spring.soft}
        >
          {sponsor.emoji}
        </motion.span>
        <div className="relative flex items-end gap-3">
          <SponsorMark sponsor={sponsor} size={compact ? 44 : 60} />
          {!compact && sponsor.offer && (
            <p className="max-w-[16rem] font-display text-xl leading-tight font-bold text-balance drop-shadow">
              {sponsor.offer}
            </p>
          )}
        </div>
      </div>
      <div className={cn('flex flex-1 flex-col', compact ? 'p-3 sm:p-4' : 'p-5 sm:p-6')}>
        <h2
          className={cn(
            'font-display leading-tight font-bold text-ink',
            compact ? 'text-lg' : 'text-2xl',
          )}
        >
          {link.external ? (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="after:absolute after:inset-0 after:content-['']"
            >
              {sponsor.name}
            </a>
          ) : (
            <Link
              href="/marcas#aliados"
              className="after:absolute after:inset-0 after:content-['']"
            >
              {sponsor.name}
            </Link>
          )}
        </h2>
        {compact ? (
          sponsor.couponCode && (
            <p className="mt-1 text-sm font-bold text-brand">Usá {sponsor.couponCode}</p>
          )
        ) : (
          <>
            {sponsor.tagline && (
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/65">{sponsor.tagline}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.82rem] font-medium text-ink/70">
              {sponsor.couponCode && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 font-bold text-brand-dark">
                  <TicketPercent className="size-4" aria-hidden /> {sponsor.couponCode}
                </span>
              )}
              {sponsor.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4 text-brand" aria-hidden /> {sponsor.city}
                </span>
              )}
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 border-t border-black/[0.06] pt-4 text-sm font-bold text-ink">
              Conocelo
              <motion.span
                className="inline-flex"
                variants={{ rest: { x: 0, y: 0 }, hover: { x: 3, y: -3 } }}
                transition={spring.snappy}
              >
                <ArrowUpRight className="size-4" aria-hidden />
              </motion.span>
            </span>
          </>
        )}
      </div>
    </motion.article>
  )
}

function HouseTile({ compact }: { compact: boolean }) {
  const emojis = industries.slice(0, 4).map((i) => i.emoji)
  return (
    <motion.article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden border-2 border-dashed border-brand/30 bg-gradient-to-br from-brand-soft via-white to-[#f4ecfb] transition-colors duration-300 hover:border-brand/60',
        compact ? 'rounded-[22px] p-4' : 'rounded-[28px] p-6 sm:p-7',
      )}
      initial="rest"
      animate="rest"
      whileHover="hover"
      variants={{ rest: { y: 0 }, hover: { y: compact ? -4 : -8 } }}
      transition={spring.soft}
    >
      <span className="text-[0.62rem] font-extrabold tracking-[0.16em] text-brand uppercase">
        {houseAd.eyebrow}
      </span>
      <div
        aria-hidden
        className={cn('relative my-4 flex items-center', compact ? 'h-16' : 'h-28 sm:h-32')}
      >
        {emojis.map((e, i) => (
          <Float key={e} distance={6} duration={5 + i} delay={i * 0.4} className="-ml-3 first:ml-0">
            <motion.span
              className={cn(
                'grid place-items-center rounded-2xl bg-white shadow-[0_10px_24px_-10px_rgba(42,36,51,0.35)] ring-1 ring-black/5',
                compact ? 'size-11 text-xl' : 'size-16 text-3xl sm:size-[4.5rem]',
              )}
              style={{ rotate: (i - 1.5) * 7 }}
              variants={{ rest: { y: 0 }, hover: { y: i % 2 ? -8 : 6 } }}
              transition={spring.bouncy}
            >
              {e}
            </motion.span>
          </Float>
        ))}
      </div>
      <h2
        className={cn(
          'font-display leading-tight font-bold text-balance text-ink',
          compact ? 'text-base' : 'text-2xl',
        )}
      >
        <Link href="/marcas" className="after:absolute after:inset-0 after:content-['']">
          {compact ? '¿Tenés un negocio?' : houseAd.title}
        </Link>
      </h2>
      {!compact && <p className="mt-2 leading-relaxed text-ink/65">{houseAd.text}</p>}
      <span
        className={cn(
          'mt-auto inline-flex items-center gap-1.5 pt-4 font-bold text-brand',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        {compact ? 'Sumate' : houseAd.cta}
        <motion.span
          className="inline-flex"
          variants={{ rest: { x: 0 }, hover: { x: 4 } }}
          transition={spring.snappy}
        >
          <ArrowRight className="size-4" aria-hidden />
        </motion.span>
      </span>
    </motion.article>
  )
}

// ── Banner ancho (portada, precios) ───────────────────────────────────────

export function SponsorBand({
  sponsor,
  className,
}: {
  sponsor: PublicSponsor | null
  className?: string
}) {
  return sponsor ? (
    <SponsorBandLive sponsor={sponsor} className={className} />
  ) : (
    <HouseBand className={className} />
  )
}

function SponsorBandLive({ sponsor, className }: { sponsor: PublicSponsor; className?: string }) {
  const link = sponsorLink(sponsor)
  const cta = (
    <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-ink shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]">
      Conocelo <ArrowUpRight className="size-4" aria-hidden />
    </span>
  )
  return (
    <motion.aside
      aria-label={`Aliado de Boxie: ${sponsor.name}`}
      className={cn(
        'relative isolate mx-auto flex max-w-5xl flex-col items-start gap-5 overflow-hidden rounded-[32px] p-6 text-white sm:flex-row sm:items-center sm:p-8',
        className,
      )}
      style={{
        background: `linear-gradient(120deg, color-mix(in srgb, ${sponsor.color} 80%, #2a2433) 0%, ${sponsor.color} 60%, color-mix(in srgb, ${sponsor.color} 70%, white) 100%)`,
      }}
      initial="rest"
      animate="rest"
      whileHover="hover"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -top-10 right-10 -z-10 text-[10rem] opacity-20 select-none"
        variants={{ rest: { rotate: -10 }, hover: { rotate: 6 } }}
        transition={spring.soft}
      >
        {sponsor.emoji}
      </motion.span>
      <SponsorMark sponsor={sponsor} size={72} />
      <div className="min-w-0 flex-1">
        <SponsorLabel light />
        <p className="mt-2 font-display text-2xl leading-tight font-bold sm:text-3xl">
          {sponsor.offer || sponsor.name}
        </p>
        <p className="mt-1 text-white/80">
          {sponsor.offer ? sponsor.name : sponsor.tagline}
          {sponsor.city && ` · ${sponsor.city}`}
          {sponsor.couponCode && (
            <>
              {' · '}Usá <strong className="text-white">{sponsor.couponCode}</strong>
            </>
          )}
        </p>
      </div>
      {link.external ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="shrink-0"
        >
          {cta}
        </a>
      ) : (
        <Link href="/marcas#aliados" className="shrink-0">
          {cta}
        </Link>
      )}
    </motion.aside>
  )
}

function HouseBand({ className }: { className?: string }) {
  return (
    <motion.aside
      aria-label="Ribbly para marcas"
      className={cn(
        'relative isolate mx-auto grid max-w-5xl items-center gap-6 overflow-hidden rounded-[32px] bg-ink p-6 text-white sm:p-9 md:grid-cols-[1fr_auto]',
        className,
      )}
      initial="rest"
      animate="rest"
      whileHover="hover"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-10 -z-10 size-72 rounded-full bg-brand/35 blur-3xl"
      />
      <div>
        <span className="text-[0.68rem] font-extrabold tracking-[0.18em] text-brand-muted uppercase">
          {houseAd.eyebrow}
        </span>
        <p className="mt-2 font-display text-2xl leading-tight font-bold text-balance sm:text-3xl">
          {houseAd.band.title}
        </p>
        <p className="mt-2 max-w-xl text-white/70">{houseAd.band.text}</p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Rubros">
          {industries.map((i, n) => (
            <motion.li
              key={i.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold"
              variants={{ rest: { y: 0 }, hover: { y: n % 2 ? -3 : 3 } }}
              transition={spring.bouncy}
            >
              <span aria-hidden>{i.emoji}</span> {i.label}
            </motion.li>
          ))}
        </ul>
      </div>
      <Link
        href="/marcas"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 font-bold text-white shadow-[0_10px_28px_rgb(244_78_99/0.45)] transition-colors hover:bg-brand-dark"
      >
        {houseAd.cta}
        <motion.span
          className="inline-flex"
          variants={{ rest: { x: 0 }, hover: { x: 4 } }}
          transition={spring.snappy}
        >
          <ArrowRight className="size-4" aria-hidden />
        </motion.span>
      </Link>
    </motion.aside>
  )
}
