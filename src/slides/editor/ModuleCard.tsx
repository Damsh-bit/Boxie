'use client'

import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Check, ChevronDown, Eye } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { Collapse, ease, spring } from '@/ui/motion'
import { EDITOR_ICONS } from './icons'
import type { EditorModule, ModuleProgress, ModuleState } from './modules'

interface Props {
  module: EditorModule
  progress: ModuleProgress
  open: boolean
  onToggle(): void
  /** Mostrar la slide del módulo en la vista previa (en el celular abre la vista previa). */
  onPreview(): void
  children: ReactNode
}

export function ModuleCard({ module, progress, open, onToggle, onPreview, children }: Props) {
  const Icon = EDITOR_ICONS[module.icon]
  const panelId = `modulo-${module.id}`
  const complete = progress.state === 'complete'

  // Cada vez que el módulo pasa a "listo", el ícono festeja (no al cargar la página).
  const [seen, setSeen] = useState<ModuleState>(progress.state)
  const [cheers, setCheers] = useState(0)
  if (seen !== progress.state) {
    setSeen(progress.state)
    if (complete) setCheers((c) => c + 1)
  }
  const tile = useAnimationControls()
  useEffect(() => {
    if (cheers === 0) return
    void tile.start({
      scale: [1, 1.22, 0.95, 1],
      rotate: [0, -8, 4, 0],
      transition: { duration: 0.6, ease: ease.out },
    })
  }, [cheers, tile])

  return (
    <section
      id={`seccion-${module.id}`}
      className={cn(
        'scroll-mt-24 rounded-3xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.05)] ring-brand/15 transition-[box-shadow] duration-300',
        open ? 'ring-2' : 'ring-0 hover:shadow-[0_14px_44px_rgba(0,0,0,0.08)]',
      )}
    >
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-4 rounded-3xl p-5 text-left sm:px-6"
        >
          <motion.span
            className={cn(
              'relative grid size-11 shrink-0 place-items-center rounded-2xl transition-colors duration-500',
              complete ? 'bg-green-50 text-green-600' : 'bg-brand-soft text-brand',
            )}
            animate={tile}
          >
            <Icon className="size-5" aria-hidden />
            <AnimatePresence initial={false}>
              {complete && (
                <motion.span
                  className="absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full bg-green-500 text-white ring-2 ring-white"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={spring.bouncy}
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-tight font-bold text-ink">
              {module.title}
            </span>
            <AnimatePresence initial={false}>
              {!open && (
                <motion.span
                  key="intro"
                  className="block overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={spring.soft}
                >
                  <span className="mt-0.5 block truncate text-sm text-neutral-500">
                    {module.intro}
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <StatusBadge state={progress.state} />
          <motion.span
            className="grid size-8 shrink-0 place-items-center rounded-full text-neutral-400"
            animate={{
              rotate: open ? 180 : 0,
              backgroundColor: open ? '#fff0f3' : 'rgba(255,240,243,0)',
            }}
            transition={spring.snappy}
            aria-hidden
          >
            <ChevronDown className="size-5" />
          </motion.span>
        </button>
      </h2>

      <Collapse open={open} id={panelId}>
        <div className="border-t border-neutral-100 px-5 pt-5 pb-6 sm:px-6">
          <p className="mb-5 text-sm leading-relaxed text-neutral-600">{module.intro}</p>
          <AnimatePresence initial={false}>
            {progress.missing.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring.soft}
                className="overflow-hidden"
              >
                <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Para poder regalarla falta:{' '}
                  <strong>{progress.missing.map((m) => m.label).join(', ')}</strong>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {children}
          <motion.button
            type="button"
            onClick={onPreview}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand lg:hidden"
            whileTap={{ scale: 0.95 }}
          >
            <Eye className="size-4" aria-hidden /> Ver cómo queda
          </motion.button>
        </div>
      </Collapse>
    </section>
  )
}

const BADGES: Record<ModuleState, { className: string; label: string; short: string }> = {
  complete: { className: 'bg-green-50 text-green-700', label: '✓ Listo', short: '✓' },
  incomplete: { className: 'bg-amber-50 text-amber-800', label: 'Falta completar', short: 'Falta' },
  optional: { className: 'bg-neutral-100 text-neutral-500', label: 'Opcional', short: 'Opcional' },
}

function StatusBadge({ state }: { state: ModuleState }) {
  const badge = BADGES[state]
  return (
    <span className="relative grid shrink-0 justify-items-end">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', badge.className)}
          initial={{ opacity: 0, scale: 0.6, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: -6 }}
          transition={spring.bouncy}
        >
          <span className="sm:hidden">{badge.short}</span>
          <span className="hidden sm:inline">{badge.label}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
