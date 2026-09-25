'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  CornerDownLeft,
  Gift,
  Plus,
  Search,
  Users,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'
import type { NavGroup } from './nav'

interface Command {
  id: string
  label: string
  hint: string
  icon: LucideIcon
  href: Route
  group: string
}

const ACTIONS: Omit<Command, 'group'>[] = [
  {
    id: 'generar',
    label: 'Generar temáticas desde una lista',
    hint: 'Generador',
    icon: WandSparkles,
    href: '/admin/generador',
  },
  {
    id: 'nuevo-cupon',
    label: 'Crear un cupón',
    hint: 'Cupones',
    icon: Plus,
    href: '/admin/cupones?nuevo=1' as Route,
  },
  {
    id: 'nueva-tarea',
    label: 'Anotar una tarea',
    hint: 'Tareas',
    icon: Plus,
    href: '/admin/tareas?nueva=1' as Route,
  },
]

const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Buscador rápido (Ctrl/⌘ K): secciones, acciones y búsqueda directa de
 * Boxies (por código, mail o destinatario) y clientes.
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean
  onOpenChange(open: boolean): void
  groups: NavGroup[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const nav = groups.flatMap((g) =>
      g.items.map((i) => ({
        id: i.href,
        label: i.label,
        hint: i.hint,
        icon: i.icon,
        href: i.href,
        group: 'Secciones',
      })),
    )
    const actions = ACTIONS.filter((a) =>
      nav.some((n) => a.href.startsWith(n.href) && (n.href as string) !== '/admin'),
    ).map((a) => ({ ...a, group: 'Acciones' }))
    const q = query.trim()
    const search: Command[] = q
      ? [
          {
            id: 'buscar-boxie',
            label: `Buscar "${q}" en Boxies`,
            hint: 'Código, mail del comprador o destinatario',
            icon: Gift,
            href: `/admin/boxies?q=${encodeURIComponent(q)}` as Route,
            group: 'Buscar',
          },
          {
            id: 'buscar-cliente',
            label: `Buscar "${q}" en clientes`,
            hint: 'Nombre o mail',
            icon: Users,
            href: `/admin/clientes?q=${encodeURIComponent(q)}` as Route,
            group: 'Buscar',
          },
        ]
      : []
    const needle = strip(q)
    const match = (c: Command) =>
      !needle || strip(c.label).includes(needle) || strip(c.hint).includes(needle)
    return [...nav.filter(match), ...actions.filter(match), ...search]
  }, [groups, query])

  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setQuery('')
      setSelected(0)
    }
  }
  const active = Math.min(selected, Math.max(commands.length - 1, 0))

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (command: Command | undefined) => {
    if (!command) return
    onOpenChange(false)
    router.push(command.href)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[150] bg-ink/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed top-[12vh] left-1/2 z-[151] w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(42,36,51,0.3)] outline-none"
                style={{ x: '-50%' }}
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
                transition={spring.snappy}
              >
                <Dialog.Title className="sr-only">Buscar en el panel</Dialog.Title>
                <div className="flex items-center gap-3 border-b border-line px-5">
                  <Search className="size-5 text-neutral-400" aria-hidden />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setSelected(0)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setSelected((s) => Math.min(s + 1, commands.length - 1))
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setSelected((s) => Math.max(s - 1, 0))
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        go(commands[active])
                      }
                    }}
                    placeholder="Sección, acción, código de Boxie o mail…"
                    className="h-16 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-neutral-400"
                    aria-label="Buscar"
                    role="combobox"
                    aria-expanded
                    aria-controls="palette-list"
                    aria-activedescendant={commands[active] ? `cmd-${active}` : undefined}
                  />
                  <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-neutral-500">
                    Esc
                  </kbd>
                </div>
                <div
                  ref={listRef}
                  id="palette-list"
                  role="listbox"
                  className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
                >
                  {commands.length === 0 && (
                    <p className="px-4 py-10 text-center text-sm text-neutral-500">
                      Nada coincide con “{query}”.
                    </p>
                  )}
                  {commands.map((command, index) => {
                    const Icon = command.icon
                    const header =
                      index === 0 || commands[index - 1]!.group !== command.group
                        ? command.group
                        : null
                    const isActive = index === active
                    return (
                      <div key={command.id}>
                        {header && (
                          <p className="px-3 pt-3 pb-1 text-[11px] font-bold tracking-widest text-neutral-400 uppercase">
                            {header}
                          </p>
                        )}
                        <button
                          type="button"
                          id={`cmd-${index}`}
                          role="option"
                          aria-selected={isActive}
                          data-index={index}
                          onMouseMove={() => setSelected(index)}
                          onClick={() => go(command)}
                          className={cn(
                            'relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left',
                            isActive ? 'text-ink' : 'text-neutral-600',
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="palette-active"
                              className="absolute inset-0 rounded-2xl bg-brand-soft"
                              transition={spring.snappy}
                            />
                          )}
                          <span
                            className={cn(
                              'relative grid size-9 shrink-0 place-items-center rounded-xl transition-colors',
                              isActive ? 'bg-brand text-white' : 'bg-canvas text-neutral-500',
                            )}
                          >
                            <Icon className="size-[18px]" aria-hidden />
                          </span>
                          <span className="relative min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {command.label}
                            </span>
                            <span className="block truncate text-xs text-neutral-500">
                              {command.hint}
                            </span>
                          </span>
                          {isActive && (
                            <CornerDownLeft className="relative size-4 text-brand" aria-hidden />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
