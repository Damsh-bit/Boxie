'use client'

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'framer-motion'
import { ArrowRight, Gift } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Route } from 'next'
import { ButtonLink } from './Button'
import { cn } from './cn'
import { ease, spring } from './motion'

const LINKS: { href: Route; label: string }[] = [
  { href: '/galeria', label: 'Galería' },
  { href: '/precios', label: 'Precios' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/ayuda', label: 'Ayuda' },
  { href: '/contacto', label: 'Contacto' },
]

const isCurrent = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

/**
 * Barra de navegación. Transparente arriba de todo; al scrollear se vuelve
 * sólida (con blur) y se achica, se esconde al bajar y vuelve al subir. Todo
 * con valores de movimiento: scrollear no re-renderiza nada.
 */
export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)
  // Al navegar se cierra el menú (estado derivado de la ruta, sin efecto).
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  const { scrollY } = useScroll()
  const surface = useTransform(scrollY, [0, 56], [0, 1])
  const height = useTransform(scrollY, [0, 120], [90, 72])
  const logoScale = useTransform(scrollY, [0, 120], [1, 0.86])
  const offset = useMotionValue(0)
  const hidden = useRef(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? y
    const hide = !open && y > 240 && y > previous
    const show = y < 240 || previous - y > 6
    if (hide && !hidden.current) {
      hidden.current = true
      void animate(offset, -110, spring.soft)
    } else if (show && hidden.current) {
      hidden.current = false
      void animate(offset, 0, spring.soft)
    }
  })

  // Con el menú abierto la página de atrás no scrollea; Escape lo cierra.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <motion.header className="fixed inset-x-0 top-0 z-50" style={{ y: offset }}>
        <motion.div
          aria-hidden
          className="absolute inset-0 border-b border-black/5 bg-white/80 shadow-[0_8px_30px_rgba(42,36,51,0.06)] backdrop-blur-xl backdrop-saturate-150"
          style={{ opacity: open ? 1 : surface }}
        />
        <motion.nav
          aria-label="Principal"
          className="relative mx-auto flex w-[90%] max-w-6xl items-center justify-between"
          style={{ height: open ? 90 : height }}
        >
          <Link href="/" className="flex h-full items-center" aria-label="Boxie, inicio">
            <motion.span
              className="block origin-left"
              style={{ scale: logoScale }}
              whileHover={{ rotate: -3 }}
              transition={spring.bouncy}
            >
              <Image
                src="/brand/boxie-logo.png"
                alt="Boxie"
                width={129}
                height={45}
                priority
                className="h-[45px] w-auto"
              />
            </motion.span>
          </Link>

          <DesktopLinks pathname={pathname} />

          <div className="hidden items-center gap-3 lg:flex">
            <ButtonLink href="/galeria" size="sm" className="h-10 px-5">
              <Gift className="size-4" aria-hidden /> Regalar
            </ButtonLink>
          </div>

          <MenuButton open={open} onToggle={() => setOpen((o) => !o)} />
        </motion.nav>
      </motion.header>

      <MobileMenu open={open} pathname={pathname} onClose={() => setOpen(false)} />
    </>
  )
}

function DesktopLinks({ pathname }: { pathname: string }) {
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <ul className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setHovered(null)}>
      {LINKS.map((link) => {
        const current = isCurrent(pathname, link.href)
        return (
          <li key={link.href} className="relative">
            <Link
              href={link.href}
              aria-current={current ? 'page' : undefined}
              onMouseEnter={() => setHovered(link.href)}
              onFocus={() => setHovered(link.href)}
              onBlur={() => setHovered(null)}
              className={cn(
                'relative z-10 block rounded-full px-4 py-2 text-[0.95rem] font-semibold transition-colors duration-200',
                current ? 'text-brand' : 'text-ink hover:text-brand',
              )}
            >
              {link.label}
            </Link>
            {hovered === link.href && (
              <motion.span
                layoutId="nav-hover"
                className="absolute inset-0 rounded-full bg-brand/[0.07]"
                transition={spring.snappy}
                aria-hidden
              />
            )}
            {current && (
              <motion.span
                layoutId="nav-current"
                className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand"
                transition={spring.soft}
                aria-hidden
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function MenuButton({ open, onToggle }: { open: boolean; onToggle(): void }) {
  const line = 'absolute left-1/2 h-[2.5px] w-6 -translate-x-1/2 rounded-full bg-ink'
  return (
    <motion.button
      type="button"
      className="relative size-11 rounded-full lg:hidden"
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={open}
      aria-controls="menu-movil"
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
    >
      <motion.span
        className={line}
        style={{ top: 14 }}
        animate={open ? { y: 7.5, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={spring.snappy}
      />
      <motion.span
        className={line}
        style={{ top: 21.5 }}
        animate={open ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.18 }}
      />
      <motion.span
        className={line}
        style={{ top: 29 }}
        animate={open ? { y: -7.5, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={spring.snappy}
      />
    </motion.button>
  )
}

function MobileMenu({
  open,
  pathname,
  onClose,
}: {
  open: boolean
  pathname: string
  onClose(): void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          id="menu-movil"
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white px-6 pt-[104px] pb-10 lg:hidden"
          initial={{ clipPath: 'inset(0% 0% 100% 0% round 0px 0px 32px 32px)' }}
          animate={{ clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)' }}
          exit={{ clipPath: 'inset(0% 0% 100% 0% round 0px 0px 32px 32px)' }}
          transition={{ duration: 0.55, ease: ease.out }}
        >
          <motion.ul
            className="flex flex-col"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
              show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
            }}
          >
            {LINKS.map((link) => {
              const current = isCurrent(pathname, link.href)
              return (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
                  }}
                  className="border-b border-neutral-100"
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'group flex items-center justify-between py-5 font-display text-3xl font-bold',
                      current ? 'text-brand' : 'text-ink',
                    )}
                  >
                    {link.label}
                    <ArrowRight
                      className="size-6 text-brand opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden
                    />
                  </Link>
                </motion.li>
              )
            })}
          </motion.ul>

          <motion.div
            className="mt-auto flex flex-col gap-3 pt-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.35, duration: 0.5, ease: ease.out },
            }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <ButtonLink href="/galeria" size="lg" block onClick={onClose}>
              <Gift className="size-5" aria-hidden /> Regalar una Boxie
            </ButtonLink>
            <ButtonLink
              href="/mi-boxie"
              variant="secondary"
              size="lg"
              block
              onClick={onClose}
              className="text-base"
            >
              Ya compré: entrar a mi Boxie
            </ButtonLink>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
