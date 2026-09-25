'use client'

import { motion } from 'framer-motion'
import { GitCommitVertical, History, RotateCcw, ShieldCheck } from 'lucide-react'
import { formatDateTime, formatRelative } from '@/domain/admin/format'
import type { ThemeVersionInfo } from '@/domain/admin/types'
import { Button } from '@/ui/Button'
import { ease } from '@/ui/motion'
import { Badge, Card, EmptyState } from '../../../_ui/primitives'

/**
 * Historial de versiones publicadas. Son inmutables: cada Boxie vendida
 * apunta a la suya, así que editar la temática nunca cambia un regalo ya
 * vendido. Una versión vieja se puede traer como borrador y republicar.
 */
export function VersionsTab({
  versions,
  currentVersionId,
  onRestore,
  restoring,
}: {
  versions: ThemeVersionInfo[]
  currentVersionId: string | null
  onRestore(version: ThemeVersionInfo): void
  restoring: boolean
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        {versions.length === 0 ? (
          <EmptyState
            icon={<History />}
            title="Todavía no se publicó"
            text="Cuando publiques, cada versión queda guardada acá para siempre."
          />
        ) : (
          <ol className="relative space-y-1">
            {versions.map((v, i) => {
              const current = v.id === currentVersionId
              return (
                <motion.li
                  key={v.id}
                  className="relative flex items-start gap-4 rounded-2xl p-3 transition-colors hover:bg-canvas"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: ease.out, delay: i * 0.05 }}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${current ? 'bg-brand text-white' : 'bg-canvas text-neutral-500'}`}
                  >
                    <GitCommitVertical className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      Versión {v.version}
                      {current && (
                        <Badge tone="good" dot>
                          Vigente
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {formatDateTime(v.publishedAt)} · {formatRelative(v.publishedAt)}
                      {v.createdBy ? ` · ${v.createdBy}` : ''}
                    </p>
                    <p className="text-xs text-neutral-500">{v.slides} pantallas</p>
                  </div>
                  {!current && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={restoring}
                      onClick={() => onRestore(v)}
                    >
                      <RotateCcw className="size-3.5" aria-hidden /> Usar como borrador
                    </Button>
                  )}
                </motion.li>
              )
            })}
          </ol>
        )}
      </Card>
      <Card className="h-fit bg-gradient-to-br from-white to-brand-soft/40">
        <ShieldCheck className="mb-3 size-8 text-brand" aria-hidden />
        <h3 className="font-semibold text-ink">Las versiones no se pisan</h3>
        <p className="mt-2 text-sm text-neutral-600">
          Cada compra queda atada a la versión vigente en ese momento. Podés cambiar textos,
          pantallas y planes tranquilo: los regalos ya vendidos se siguen viendo exactamente igual.
        </p>
      </Card>
    </div>
  )
}
