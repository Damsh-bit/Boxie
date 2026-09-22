'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { formatARS } from '@/domain/money'
import { buttonVariants } from '@/ui/Button'
import { cn } from '@/ui/cn'

interface Props {
  slug: string
  priceCents: number
  offer: { code: string; label: string; delaySeconds: number; priceCents: number } | null
  /** Lo que va entre el precio y el botón (la lista de características). */
  children?: ReactNode
}

/**
 * Precio y botón de compra. A los N segundos aparece la oferta de urgencia:
 * el monto que se muestra es el del cupón real, y el cupón viaja al checkout,
 * donde el servidor lo vuelve a validar (acá solo se muestra).
 */
export function BuyBox({ slug, priceCents, offer, children }: Props) {
  const [showOffer, setShowOffer] = useState(false)

  const delay = offer?.delaySeconds
  useEffect(() => {
    if (delay === undefined) return
    const timer = setTimeout(() => setShowOffer(true), delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])

  const active = showOffer && offer
  const href = `/checkout?tematica=${slug}${active ? `&cupon=${offer.code}` : ''}` as Route

  return (
    <>
      <div className="mt-1 mb-2.5" aria-live="polite">
        {active ? (
          <div className="flex items-center gap-2.5">
            <span className="text-lg text-neutral-400 line-through">{formatARS(priceCents)}</span>
            <span className="font-display text-[32px] font-bold text-brand">
              {formatARS(offer.priceCents)}
            </span>
          </div>
        ) : (
          <span className="font-display text-[28px] font-bold text-ink">
            {formatARS(priceCents)}
          </span>
        )}
      </div>

      {children}

      <div className="w-full">
        {active && (
          <div className="mb-3 flex animate-pop-in items-center gap-3 rounded-xl border border-amber-300 bg-[#FFFBEA] p-3 text-left text-[#5d4037] shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <span className="text-2xl" aria-hidden>
              🎁
            </span>
            <div className="flex flex-col">
              <strong className="text-[13px] tracking-wide text-red-700 uppercase">
                ¡Oferta especial para vos!
              </strong>
              <p className="mt-0.5 text-xs leading-tight">
                Si comprás ya, tenés un{' '}
                <span className="rounded bg-red-700 px-1 font-extrabold text-white">
                  {offer.label}
                </span>{' '}
                aplicado.
              </p>
            </div>
          </div>
        )}
        <Link
          href={href}
          className={cn(
            buttonVariants({ block: true }),
            'h-auto rounded-xl py-3 font-display text-base tracking-wider uppercase',
            active && 'animate-pulse-ring',
          )}
        >
          {active ? 'Quiero mi Boxie con descuento' : 'Quiero mi Boxie'}
        </Link>
      </div>
    </>
  )
}
