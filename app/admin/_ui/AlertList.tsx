'use client'

import { motion } from 'framer-motion'
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  OctagonAlert,
  TriangleAlert,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { Alert, AlertLevel } from '@/domain/admin/metrics'
import { cn } from '@/ui/cn'
import { ease } from '@/ui/motion'

const LEVEL: Record<AlertLevel, { icon: typeof Info; label: string; className: string }> = {
  critical: { icon: OctagonAlert, label: 'Urgente', className: 'bg-[#fdeaea] text-critical' },
  serious: { icon: TriangleAlert, label: 'Importante', className: 'bg-[#fdefe8] text-[#b4552f]' },
  warning: { icon: CircleAlert, label: 'Atención', className: 'bg-[#fff4d6] text-[#8a6300]' },
  info: { icon: Info, label: 'Para saber', className: 'bg-[#e6f0fb] text-series-2' },
}

/** Alertas con ícono y rótulo de gravedad (el color nunca va solo). */
export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0)
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#e7f6e7] p-4 text-sm text-good-ink">
        <CircleCheck className="size-5 shrink-0" aria-hidden />
        Todo en orden: nada urgente para revisar.
      </div>
    )
  return (
    <ul className="space-y-2">
      {alerts.map((alert, i) => {
        const level = LEVEL[alert.level]
        const Icon = level.icon
        return (
          <motion.li
            key={alert.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: ease.out, delay: 0.1 + i * 0.06 }}
          >
            <Link
              href={alert.href as Route}
              className="group flex items-start gap-3 rounded-2xl border border-line p-3.5 transition-colors hover:border-neutral-300 hover:bg-canvas"
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-xl',
                  level.className,
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[11px] font-bold tracking-wide text-neutral-500 uppercase">
                  {level.label}
                </span>
                <span className="block text-sm font-semibold text-ink">{alert.title}</span>
                <span className="block text-xs text-neutral-600">{alert.detail}</span>
              </span>
              <ChevronRight
                className="mt-2 size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </motion.li>
        )
      })}
    </ul>
  )
}
