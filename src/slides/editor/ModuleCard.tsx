'use client'

import { ChevronDown, Eye } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { EDITOR_ICONS } from './icons'
import type { EditorModule, ModuleProgress } from './modules'

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
  return (
    <section
      id={`seccion-${module.id}`}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.05)] transition',
        open && 'ring-2 ring-brand/15',
      )}
    >
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-4 p-5 text-left sm:px-6"
        >
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-2xl',
              progress.state === 'complete'
                ? 'bg-green-50 text-green-600'
                : 'bg-brand-soft text-brand',
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-tight font-bold text-ink">
              {module.title}
            </span>
            {!open && (
              <span className="mt-0.5 block truncate text-sm text-neutral-500">{module.intro}</span>
            )}
          </span>
          <StatusBadge progress={progress} />
          <ChevronDown
            className={cn('size-5 shrink-0 text-neutral-400 transition', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h2>

      <div
        id={panelId}
        hidden={!open}
        className="border-t border-neutral-100 px-5 pt-5 pb-6 sm:px-6"
      >
        <p className="mb-5 text-sm leading-relaxed text-neutral-600">{module.intro}</p>
        {progress.missing.length > 0 && (
          <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Para poder regalarla falta:{' '}
            <strong>{progress.missing.map((m) => m.label).join(', ')}</strong>.
          </p>
        )}
        {children}
        <button
          type="button"
          onClick={onPreview}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline lg:hidden"
        >
          <Eye className="size-4" aria-hidden /> Ver cómo queda
        </button>
      </div>
    </section>
  )
}

function StatusBadge({ progress }: { progress: ModuleProgress }) {
  const styles = {
    complete: ['bg-green-50 text-green-700', '✓ Listo', '✓'],
    incomplete: ['bg-amber-50 text-amber-800', 'Falta completar', 'Falta'],
    optional: ['bg-neutral-100 text-neutral-500', 'Opcional', 'Opcional'],
  } as const
  const [className, label, short] = styles[progress.state]
  return (
    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
