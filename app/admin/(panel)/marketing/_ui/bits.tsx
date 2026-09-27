'use client'

import { motion } from 'framer-motion'
import {
  ChevronRight,
  CircleCheck,
  CircleAlert,
  Info,
  OctagonAlert,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { channelLabel, type ChannelId } from '@/domain/marketing/channels'
import type { Insight, InsightTone } from '@/domain/marketing/insights'
import {
  CAMPAIGN_STATE_LABEL,
  VERDICT_HINT,
  VERDICT_LABEL,
  type Verdict,
} from '@/domain/marketing/performance'
import {
  ATTRIBUTION_MODELS,
  type AttributionModel,
  type CampaignState,
} from '@/domain/marketing/types'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'
import { Badge, type Tone } from '../../../_ui/primitives'
import { useScopedNavigation } from '../../../_ui/RangePicker'
import { channelColor } from './colors'

/** Canal con su punto de color (la identidad nunca es solo el color: va el nombre). */
export function ChannelTag({ channel, className }: { channel: ChannelId; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span
        className="size-2.5 shrink-0 rounded-[3px]"
        style={{ background: channelColor(channel) }}
        aria-hidden
      />
      <span className="truncate">{channelLabel(channel)}</span>
    </span>
  )
}

const VERDICT_TONE: Record<Verdict, Tone> = {
  escalar: 'good',
  mantener: 'info',
  optimizar: 'warning',
  pausar: 'critical',
  aprendiendo: 'violet',
  'sin-inversion': 'neutral',
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span title={VERDICT_HINT[verdict]}>
      <Badge tone={VERDICT_TONE[verdict]} dot>
        {VERDICT_LABEL[verdict]}
      </Badge>
    </span>
  )
}

const STATE_TONE: Record<CampaignState, Tone> = {
  active: 'good',
  paused: 'warning',
  scheduled: 'info',
  ended: 'neutral',
  draft: 'violet',
}

export function StateBadge({ state }: { state: CampaignState }) {
  return (
    <Badge tone={STATE_TONE[state]} dot>
      {CAMPAIGN_STATE_LABEL[state]}
    </Badge>
  )
}

/** Selector del modelo de atribución (vive en la URL: ?modelo=primer). */
export function ModelPicker({
  model,
  slugs,
}: {
  model: AttributionModel
  slugs: Record<AttributionModel, string>
}) {
  const params = useSearchParams()
  const pathname = usePathname()
  const { go, pending } = useScopedNavigation()
  return (
    <div
      role="radiogroup"
      aria-label="Modelo de atribución"
      className={cn(
        'inline-flex h-10 items-center gap-0.5 rounded-full border border-line bg-white p-1 shadow-[0_1px_2px_rgba(42,36,51,0.04)]',
        pending && 'opacity-70',
      )}
    >
      {ATTRIBUTION_MODELS.map((m) => {
        const active = m.value === model
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={m.hint}
            onClick={() => {
              const next = new URLSearchParams(params.toString())
              next.set('modelo', slugs[m.value])
              go(`${pathname}?${next}`)
            }}
            className={cn(
              'relative h-8 rounded-full px-3 text-xs font-semibold transition-colors',
              active ? 'text-white' : 'text-neutral-600 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId="model-picker"
                className="absolute inset-0 rounded-full bg-ink"
                transition={spring.snappy}
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const TONE: Record<InsightTone, { icon: LucideIcon; label: string; className: string }> = {
  critical: { icon: OctagonAlert, label: 'Urgente', className: 'bg-[#fdeaea] text-critical' },
  warning: { icon: CircleAlert, label: 'Atención', className: 'bg-[#fff4d6] text-[#8a6300]' },
  good: { icon: ThumbsUp, label: 'Oportunidad', className: 'bg-[#e7f6e7] text-good-ink' },
  info: { icon: Info, label: 'Para saber', className: 'bg-[#e6f0fb] text-series-2' },
}

/** Recomendaciones con ícono y rótulo (el color nunca va solo). */
export function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const shown = limit ? insights.slice(0, limit) : insights
  if (shown.length === 0)
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#e7f6e7] p-4 text-sm text-good-ink">
        <CircleCheck className="size-5 shrink-0" aria-hidden />
        Nada para corregir: la pauta está dentro de los objetivos.
      </div>
    )
  return (
    <ul className="space-y-2">
      {shown.map((insight, i) => {
        const tone = TONE[insight.tone]
        const Icon = tone.icon
        const body = (
          <>
            <span
              className={cn('grid size-9 shrink-0 place-items-center rounded-xl', tone.className)}
            >
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[11px] font-bold tracking-wide text-neutral-500 uppercase">
                {tone.label}
              </span>
              <span className="block text-sm font-semibold text-ink">{insight.title}</span>
              <span className="block text-xs text-neutral-600">{insight.detail}</span>
            </span>
          </>
        )
        return (
          <motion.li
            key={insight.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: ease.out, delay: 0.1 + i * 0.05 }}
          >
            {insight.href ? (
              <Link
                href={insight.href as Route}
                className="group flex items-start gap-3 rounded-2xl border border-line p-3.5 transition-colors hover:border-neutral-300 hover:bg-canvas"
              >
                {body}
                <ChevronRight
                  className="mt-2 size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-line p-3.5">
                {body}
              </div>
            )}
          </motion.li>
        )
      })}
    </ul>
  )
}

/** Una métrica chica con su rótulo (para filas de números dentro de una tarjeta). */
export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0 rounded-2xl bg-canvas px-4 py-3', className)}>
      <p className="truncate text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-neutral-500">{hint}</p>}
    </div>
  )
}
