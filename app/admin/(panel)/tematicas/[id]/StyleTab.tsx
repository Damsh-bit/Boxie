'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { ARCHETYPES, GENERAL_ARCHETYPE } from '@/slides/generator/generate'
import { DEFAULT_PALETTE, type Palette } from '@/slides/theme-config'
import { cn } from '@/ui/cn'
import { Input } from '@/ui/form'
import { spring } from '@/ui/motion'
import { Card } from '../../../_ui/primitives'
import type { EditorConfig } from './editor-state'

const FIELDS: { key: keyof Palette; label: string; hint: string }[] = [
  { key: 'primary', label: 'Principal', hint: 'Botones, acentos y fondos de color' },
  { key: 'ink', label: 'Tinta', hint: 'Textos y fondos oscuros' },
  { key: 'accent', label: 'Acento', hint: 'Detalles, premios y brillos' },
]

/** La paleta de la temática: la usan todas las slides. */
export function StyleTab({
  config,
  onChange,
}: {
  config: EditorConfig
  onChange(config: EditorConfig): void
}) {
  const palette: Palette = { ...DEFAULT_PALETTE, ...config.palette }
  const presets = useMemo(() => {
    const seen = new Set<string>()
    return [...ARCHETYPES, GENERAL_ARCHETYPE]
      .flatMap((a) => a.palettes.map((p) => ({ ...p, from: a.label })))
      .filter((p) => {
        const id = `${p.primary}${p.ink}${p.accent}`
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
  }, [])
  const set = (next: Palette) => onChange({ ...config, palette: next })
  const same = (p: Palette) =>
    p.primary.toLowerCase() === palette.primary.toLowerCase() &&
    p.ink.toLowerCase() === palette.ink.toLowerCase() &&
    p.accent.toLowerCase() === palette.accent.toLowerCase()

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="mb-1 font-semibold text-ink">Paleta</h3>
        <p className="mb-5 text-sm text-neutral-500">
          Los cambios se ven al instante en la vista previa.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="rounded-2xl border border-line p-4">
              <p className="text-sm font-semibold text-ink">{f.label}</p>
              <p className="mb-3 text-xs text-neutral-500">{f.hint}</p>
              <div className="flex items-center gap-2">
                <motion.input
                  type="color"
                  value={palette[f.key]}
                  onChange={(e) => set({ ...palette, [f.key]: e.target.value.toUpperCase() })}
                  className="size-11 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1"
                  aria-label={`Color ${f.label}`}
                  whileHover={{ scale: 1.08 }}
                  transition={spring.snappy}
                />
                <Input
                  value={palette[f.key]}
                  maxLength={7}
                  className="py-2 font-mono text-sm"
                  onChange={(e) => set({ ...palette, [f.key]: e.target.value })}
                  aria-label={`${f.label} en hexadecimal`}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-ink">Paletas de la casa</h3>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p, i) => {
            const active = same(p)
            return (
              <motion.button
                key={`${p.name}-${i}`}
                type="button"
                onClick={() => set({ primary: p.primary, ink: p.ink, accent: p.accent })}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                  active ? 'border-brand bg-brand-soft/50' : 'border-line hover:border-neutral-300',
                )}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={spring.snappy}
                aria-pressed={active}
              >
                <span className="flex shrink-0 -space-x-2">
                  {[p.primary, p.accent, p.ink].map((c) => (
                    <span
                      key={c}
                      className="size-7 rounded-full ring-2 ring-white"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{p.from}</span>
                </span>
                {active && <Check className="size-4 text-brand" aria-hidden />}
              </motion.button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
