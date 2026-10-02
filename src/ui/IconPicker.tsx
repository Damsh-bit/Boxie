'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { ICON_GROUPS, ICON_LABELS, iconFor, type IconName } from '@/domain/icons'
import { cn } from './cn'
import { Emoji, Icon } from './Icon'
import { Collapse, spring } from './motion'

/**
 * Elige uno de los íconos propios (src/domain/icons.ts). Guarda el nombre del
 * ícono; las temáticas viejas traen emojis y se muestran con su ícono
 * equivalente hasta que alguien elija otro.
 */
export function IconPicker({
  id,
  value,
  onChange,
  disabled,
  describedBy,
}: {
  id: string
  value: string
  onChange(next: string): void
  disabled?: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  // La grilla se arma la primera vez que se abre: son 102 imágenes.
  const [mounted, setMounted] = useState(false)
  const current = iconFor(value)
  const panelId = `${id}-iconos`

  const toggle = () => {
    setMounted(true)
    setOpen((o) => !o)
  }

  return (
    <div>
      <button
        type="button"
        id={id}
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={describedBy}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-brand/40 disabled:opacity-60"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-canvas">
          {value.trim() && <Emoji value={value} size={30} />}
        </span>
        <span className="min-w-0 flex-1 font-semibold text-ink">
          {current ? ICON_LABELS[current] : value.trim() ? 'Emoji sin ícono propio' : 'Sin ícono'}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy}>
          <ChevronDown className="size-4 text-neutral-500" aria-hidden />
        </motion.span>
      </button>
      <Collapse open={open} id={panelId}>
        {mounted && (
          <div className="mt-2 max-h-80 space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-white p-3">
            {ICON_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="mb-1.5 text-[0.7rem] font-extrabold tracking-wider text-ink/45 uppercase">
                  {group.label}
                </p>
                <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
                  {(Object.keys(group.icons) as IconName[]).map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={ICON_LABELS[name]}
                      aria-label={ICON_LABELS[name]}
                      aria-pressed={current === name}
                      onClick={() => {
                        onChange(name)
                        setOpen(false)
                      }}
                      className={cn(
                        'grid aspect-square place-items-center rounded-lg transition-colors hover:bg-brand-soft',
                        current === name && 'bg-brand-soft ring-2 ring-brand',
                      )}
                    >
                      <Icon name={name} size={30} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Collapse>
    </div>
  )
}
