'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, EyeOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Plan } from '@/domain/plans'
import { parseThemeConfig, type ParsedThemeConfig } from '@/slides/config'
import { Player } from '@/slides/player/Player'
import { configForPlan } from '@/slides/plans'
import { sampleGift } from '@/slides/sample'
import { spring } from '@/ui/motion'
import { Segmented } from '../../../_ui/fields'
import type { EditorConfig } from './editor-state'

/**
 * El regalo real (el mismo player que recibe el destinatario) con los
 * cambios en vivo y contenido de ejemplo. Se puede ver como lo recibe cada
 * plan: las pantallas que el plan no incluye desaparecen.
 */
export function PhonePreview({
  config,
  plans,
  planSlug,
  onPlanChange,
  selectedKey,
  onSelectKey,
}: {
  config: EditorConfig
  plans: Plan[]
  planSlug: string
  onPlanChange(slug: string): void
  selectedKey: string | null
  onSelectKey(key: string): void
}) {
  const result = useMemo(() => parseThemeConfig(config), [config])
  // Mientras hay un campo inválido se sigue mostrando la última versión que funcionaba.
  const [lastValid, setLastValid] = useState<ParsedThemeConfig | null>(null)
  if (result.success && result.data !== lastValid) setLastValid(result.data)
  const parsed = result.success ? result.data : lastValid
  const plan = plans.find((p) => p.slug === planSlug) ?? plans.at(-1)
  const shown = useMemo(
    () => (parsed && plan ? configForPlan(parsed, plan, plans) : parsed),
    [parsed, plan, plans],
  )
  const data = useMemo(() => (shown ? sampleGift(shown) : null), [shown])
  const index = shown ? shown.slides.findIndex((s) => s.key === selectedKey) : -1
  const [manual, setManual] = useState<number | null>(null)
  const [lastSelected, setLastSelected] = useState(selectedKey)
  if (selectedKey !== lastSelected) {
    setLastSelected(selectedKey)
    setManual(null)
  }
  const slide = index >= 0 ? index : (manual ?? 0)
  const excluded =
    selectedKey !== null && index < 0 && parsed?.slides.some((s) => s.key === selectedKey)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Vista previa</p>
        {plans.length > 1 && (
          <Segmented
            id="preview-plan"
            size="sm"
            value={plan?.slug ?? ''}
            onChange={onPlanChange}
            options={plans.map((p) => ({ value: p.slug, label: p.name }))}
          />
        )}
      </div>
      <div className="relative mx-auto aspect-[9/19] h-[min(680px,calc(100dvh-13rem))] max-w-full">
        {shown && data ? (
          <Player
            config={shown}
            data={data}
            variant="embedded"
            preview
            slide={slide}
            onSlideChange={(i) => {
              setManual(i)
              const key = shown.slides[i]?.key
              if (key && key !== selectedKey) onSelectKey(key)
            }}
          />
        ) : (
          <div className="grid h-full place-items-center rounded-[2.5rem] bg-canvas p-8 text-center text-sm text-neutral-500">
            Corregí los errores para ver la vista previa.
          </div>
        )}
        <AnimatePresence>
          {(!result.success || excluded) && (
            <motion.div
              className="absolute inset-x-4 top-4 z-10 flex items-start gap-2 rounded-2xl bg-ink/90 p-3 text-xs text-white shadow-xl backdrop-blur"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring.snappy}
            >
              {excluded ? (
                <>
                  <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Esta pantalla no está en el plan {plan?.name}. Cambiá de plan arriba para verla.
                </>
              ) : (
                <>
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                  Hay campos inválidos: se muestra la última versión que funcionaba.
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-xs text-neutral-400">
        {shown ? `${shown.slides.length} pantallas en ${plan?.name ?? 'este plan'}` : ''} ·
        contenido de ejemplo
      </p>
    </div>
  )
}
