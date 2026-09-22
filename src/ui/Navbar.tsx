'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Route } from 'next'
import { cn } from './cn'

const LINKS: { href: Route; label: string; help?: boolean }[] = [
  { href: '/galeria', label: "Boxie's" },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/ayuda', label: 'Ayuda', help: true },
]

export function Navbar({ tone = 'transparent' }: { tone?: 'transparent' | 'solid' }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [lastPath, setLastPath] = useState(pathname)
  // Al navegar se cierra el menú (estado derivado de la ruta, sin efecto).
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  return (
    <nav
      className={cn(
        'absolute inset-x-0 top-0 z-50 flex h-[90px] items-center justify-center transition-colors',
        (open || tone === 'solid') && 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]',
      )}
    >
      <div className="flex h-full w-[90%] max-w-6xl items-center justify-between">
        <Link href="/" className="flex h-full items-center" aria-label="Boxie, inicio">
          <Image
            src="/brand/boxie-logo.png"
            alt="Boxie"
            width={129}
            height={45}
            priority
            className="h-[45px] w-auto transition-transform hover:scale-105"
          />
        </Link>

        <button
          type="button"
          className="flex flex-col gap-[5px] p-2 lg:hidden"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={cn(
              'h-[3px] w-[25px] rounded bg-ink transition-transform',
              open && 'translate-y-[8px] rotate-45',
            )}
          />
          <span
            className={cn(
              'h-[3px] w-[25px] rounded bg-ink transition-opacity',
              open && 'opacity-0',
            )}
          />
          <span
            className={cn(
              'h-[3px] w-[25px] rounded bg-ink transition-transform',
              open && '-translate-y-[8px] -rotate-45',
            )}
          />
        </button>

        <ul
          className={cn(
            'fixed top-[90px] left-0 flex h-[calc(100dvh-90px)] w-full flex-col border-t border-neutral-100 bg-white pt-8 transition-all duration-300',
            open ? 'visible translate-x-0 opacity-100' : 'invisible -translate-x-full opacity-0',
            'lg:visible lg:static lg:h-auto lg:w-auto lg:translate-x-0 lg:flex-row lg:items-center lg:gap-10 lg:border-none lg:bg-transparent lg:pt-0 lg:opacity-100',
          )}
        >
          {LINKS.map((link) => (
            <li key={link.href} className="w-full lg:w-auto">
              <Link
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={cn(
                  'block w-full border-b border-neutral-50 py-6 text-center text-lg font-semibold text-ink transition-colors hover:text-brand lg:rounded-full lg:border-none lg:px-4 lg:py-2 lg:text-base lg:hover:bg-brand/5',
                  link.help && 'lg:border lg:border-black/10 lg:hover:border-brand',
                  pathname === link.href && 'text-brand',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
