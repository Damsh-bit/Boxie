'use client'

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import {
  Bell,
  ExternalLink,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ADMIN_ROLES, type AdminRole } from '@/domain/admin/types'
import { initials } from '@/domain/admin/format'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'
import { CommandPalette } from './CommandPalette'
import { ConfirmProvider } from './Confirm'
import { isActive, navFor, type NavGroup } from './nav'
import { ToastProvider } from './Toast'

export interface ShellUser {
  name: string
  email: string
  role: AdminRole
}

interface ShellProps {
  user: ShellUser
  demo: boolean
  alerts: number
  logout: () => Promise<void>
  children: ReactNode
}

const COLLAPSE_KEY = 'bx-admin-sidebar'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

const collapseListeners = new Set<() => void>()
function subscribeCollapse(cb: () => void) {
  collapseListeners.add(cb)
  return () => collapseListeners.delete(cb)
}
function setCollapsedStored(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    // Sin almacenamiento (modo privado): igual cambia en esta pestaña.
  }
  collapseListeners.forEach((cb) => cb())
}

/**
 * El marco del panel: barra lateral (se achica a íconos en escritorio y es un
 * cajón en el celular), barra superior con el buscador (Ctrl/⌘ K) y el
 * contenido, que entra con un fundido corto en cada cambio de sección.
 */
export function Shell({ user, demo, alerts, logout, children }: ShellProps) {
  const pathname = usePathname()
  const groups = navFor(user.role)
  const collapsed = useSyncExternalStore(subscribeCollapse, readCollapsed, () => false)
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setDrawer(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const width = collapsed ? 84 : 272

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-dvh bg-canvas">
          {/* Escritorio */}
          <motion.aside
            className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-ink text-white lg:flex"
            initial={false}
            animate={{ width }}
            transition={spring.soft}
          >
            <Sidebar
              groups={groups}
              pathname={pathname}
              collapsed={collapsed}
              user={user}
              demo={demo}
              logout={logout}
              onToggle={() => setCollapsedStored(!collapsed)}
            />
          </motion.aside>

          {/* Celular */}
          <AnimatePresence>
            {drawer && (
              <>
                <motion.div
                  className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDrawer(false)}
                />
                <motion.aside
                  className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,86vw)] flex-col bg-ink text-white shadow-2xl lg:hidden"
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%', transition: { duration: 0.22, ease: ease.in } }}
                  transition={spring.gentle}
                  aria-label="Menú del panel"
                >
                  <button
                    type="button"
                    onClick={() => setDrawer(false)}
                    className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                    aria-label="Cerrar menú"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                  <Sidebar
                    groups={groups}
                    pathname={pathname}
                    collapsed={false}
                    user={user}
                    demo={demo}
                    logout={logout}
                    mobile
                  />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <motion.div
            className="flex min-h-dvh flex-col lg:pl-[var(--sidebar)]"
            initial={false}
            animate={{ '--sidebar': `${width}px` } as Record<string, string>}
            transition={spring.soft}
          >
            <Topbar
              user={user}
              demo={demo}
              alerts={alerts}
              onMenu={() => setDrawer(true)}
              onSearch={() => setPalette(true)}
            />
            <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pt-4 pb-16 sm:px-6 lg:px-10 lg:pt-8">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: ease.out }}
              >
                {children}
              </motion.div>
            </main>
          </motion.div>

          <CommandPalette open={palette} onOpenChange={setPalette} groups={groups} />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}

function Sidebar({
  groups,
  pathname,
  collapsed,
  user,
  demo,
  logout,
  onToggle,
  mobile = false,
}: {
  groups: NavGroup[]
  pathname: string
  collapsed: boolean
  user: ShellUser
  demo: boolean
  logout: () => Promise<void>
  onToggle?: () => void
  mobile?: boolean
}) {
  const role = ADMIN_ROLES.find((r) => r.value === user.role)?.label ?? user.role
  return (
    <>
      <div className="relative flex h-20 shrink-0 items-center px-5">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Boxie, panel">
          <AnimatePresence mode="popLayout" initial={false}>
            {collapsed ? (
              <motion.span
                key="mark"
                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={spring.bouncy}
                className="ml-1.5 block"
              >
                <Image src="/brand/boxie-mark.png" alt="Boxie" width={31} height={40} />
              </motion.span>
            ) : (
              <motion.span
                key="logo"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25, ease: ease.out }}
                className="flex items-center gap-2.5"
              >
                <Image src="/brand/boxie-logo.png" alt="Boxie" width={98} height={34} />
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white/70 uppercase">
                  Admin
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav
        className="flex-1 [scrollbar-width:thin] overflow-x-hidden overflow-y-auto px-3 pb-4"
        aria-label="Secciones del panel"
      >
        <LayoutGroup id={mobile ? 'nav-mobile' : 'nav'}>
          {groups.map((group) => (
            <div key={group.label} className="mt-4 first:mt-1">
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.p
                    className="px-3 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-white/35 uppercase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                          active
                            ? 'text-white'
                            : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="admin-nav-pill"
                            className="absolute inset-0 rounded-xl bg-brand shadow-[0_8px_24px_rgba(244,78,99,0.35)]"
                            transition={spring.soft}
                          />
                        )}
                        <motion.span
                          className="relative ml-[3px] shrink-0"
                          whileHover={{ rotate: -8, scale: 1.1 }}
                          transition={spring.snappy}
                        >
                          <Icon className="size-[19px]" aria-hidden />
                        </motion.span>
                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.span
                              className="relative truncate"
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6, transition: { duration: 0.1 } }}
                              transition={{ duration: 0.2, ease: ease.out }}
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </LayoutGroup>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        {demo && !collapsed && (
          <Link
            href="/admin/sistema"
            className="mb-2 block rounded-xl bg-gold/10 px-3 py-2 text-xs leading-snug text-gold/90 transition-colors hover:bg-gold/15"
          >
            <span className="font-bold">Modo demo.</span> Datos de muestra: la base todavía no está
            conectada.
          </Link>
        )}
        <div
          className={cn('flex items-center gap-3 rounded-xl p-2', collapsed && 'justify-center')}
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-sm font-bold"
            aria-hidden
          >
            {initials(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-white/50">{role}</p>
            </div>
          )}
          {!collapsed && (
            <form action={logout}>
              <button
                type="submit"
                className="grid size-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </form>
          )}
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label={collapsed ? 'Expandir el menú' : 'Achicar el menú'}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4" aria-hidden /> Achicar menú
              </>
            )}
          </button>
        )}
      </div>
    </>
  )
}

function Topbar({
  user,
  demo,
  alerts,
  onMenu,
  onSearch,
}: {
  user: ShellUser
  demo: boolean
  alerts: number
  onMenu: () => void
  onSearch: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onMenu}
          className="grid size-10 place-items-center rounded-full text-ink hover:bg-white lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Link href="/admin" className="lg:hidden" aria-label="Boxie, panel">
          <Image src="/brand/boxie-logo.png" alt="Boxie" width={80} height={28} />
        </Link>

        <motion.button
          type="button"
          onClick={onSearch}
          className="ml-auto flex h-10 items-center gap-2.5 rounded-full border border-line bg-white px-4 text-sm text-neutral-500 shadow-[0_1px_2px_rgba(42,36,51,0.04)] transition-colors hover:border-neutral-300 hover:text-ink sm:w-80 lg:ml-0"
          whileTap={{ scale: 0.98 }}
          aria-label="Buscar (Ctrl K)"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Buscar Boxie, cliente o sección…</span>
          <kbd className="ml-auto hidden rounded-md border border-line bg-canvas px-1.5 py-0.5 font-sans text-[11px] text-neutral-500 sm:inline">
            Ctrl K
          </kbd>
        </motion.button>

        <div className="flex items-center gap-1.5 lg:ml-auto">
          {demo && (
            <span className="hidden items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-[#8a6d00] md:inline-flex">
              <span className="size-1.5 rounded-full bg-[#c9a100]" aria-hidden /> Demo
            </span>
          )}
          <Link
            href="/"
            target="_blank"
            className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-white hover:text-ink md:inline-flex"
          >
            Ver tienda <ExternalLink className="size-3.5" aria-hidden />
          </Link>
          <Link
            href="/admin#alertas"
            className="relative grid size-10 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-white hover:text-ink"
            aria-label={alerts ? `${alerts} alertas` : 'Sin alertas'}
          >
            <Bell className="size-5" aria-hidden />
            <AnimatePresence>
              {alerts > 0 && (
                <motion.span
                  className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-4 font-bold text-white ring-2 ring-canvas"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={spring.bouncy}
                >
                  {alerts}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <span
            className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-xs font-bold text-white lg:hidden"
            title={user.email}
            aria-hidden
          >
            {initials(user.name)}
          </span>
        </div>
      </div>
    </header>
  )
}
