'use client'

import { motion } from 'framer-motion'
import {
  CalendarRange,
  Coins,
  Gauge,
  Megaphone,
  Waypoints,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin/marketing', label: 'Resumen', icon: Gauge },
  { href: '/admin/marketing/canales', label: 'Canales', icon: Waypoints },
  { href: '/admin/marketing/campanas', label: 'Campañas', icon: Megaphone },
  { href: '/admin/marketing/rentabilidad', label: 'Rentabilidad', icon: Coins },
  { href: '/admin/marketing/planificador', label: 'Planificador', icon: CalendarRange },
  { href: '/admin/marketing/herramientas', label: 'Herramientas', icon: Wrench },
]

/** Lo que se lleva de una pestaña a otra: el período y el modelo de atribución. */
const KEEP = ['periodo', 'desde', 'hasta', 'modelo']

/** Las pestañas de Marketing: la marca se desliza a la activa. */
export function MarketingNav() {
  const pathname = usePathname()
  const params = useSearchParams()
  const keep = new URLSearchParams()
  for (const key of KEEP) {
    const value = params.get(key)
    if (value) keep.set(key, value)
  }
  const query = keep.size ? `?${keep}` : ''
  return (
    <nav
      aria-label="Secciones de Marketing"
      className="-mx-4 mt-5 [scrollbar-width:none] overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max gap-1 rounded-full border border-line bg-white p-1 shadow-[0_1px_2px_rgba(42,36,51,0.04)]">
        {TABS.map((tab) => {
          const active =
            tab.href === '/admin/marketing'
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          const Icon = tab.icon
          return (
            <li key={tab.href}>
              <Link
                href={`${tab.href}${query}` as Route}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                  active ? 'text-white' : 'text-neutral-600 hover:text-ink',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="marketing-tab"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={spring.snappy}
                  />
                )}
                <Icon className="relative size-4" aria-hidden />
                <span className="relative">{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
