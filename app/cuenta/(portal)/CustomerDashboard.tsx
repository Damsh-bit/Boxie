'use client'

import { motion } from 'framer-motion'
import {
  Calendar,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Gift,
  PartyPopper,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import type { CustomerPortalData } from '@/server/customer/data'
import { Button } from '@/ui/Button'

export function CustomerDashboard({ name, data }: { name: string; data: CustomerPortalData }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyLink = (boxieId: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(boxieId)
    setTimeout(() => setCopiedId(null), 2500)
  }

  return (
    <div className="space-y-8">
      {/* Encabezado con bienvenida */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            ¡Hola, {name}! 👋
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Acá podés seguir tus regalos, editarlos y enterarte apenas los abran.
          </p>
        </div>

        <Link href="/galeria">
          <Button size="sm" className="gap-2">
            <Gift className="size-4" /> Crear nuevo regalo
          </Button>
        </Link>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Mis Boxies
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-brand/10 text-brand">
              <Gift className="size-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-ink">{data.stats.totalBoxies}</p>
          <p className="mt-1 text-xs text-neutral-500">Regalos comprados en total</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              ¡Ya Abiertas!
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <PartyPopper className="size-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-950">
            {data.stats.openedCount}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Abiertas por el agasajado</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-amber-800 uppercase">
              En Edición
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-600">
              <Edit3 className="size-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-950">
            {data.stats.inDraftCount}
          </p>
          <p className="mt-1 text-xs text-amber-700">Pendientes de finalizar</p>
        </div>
      </div>

      {/* Lista de Boxies */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-ink">Tus Regalos</h2>

        {data.boxies.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white p-12 text-center shadow-sm">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Sparkles className="size-8" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">
              Todavía no tenés ninguna Boxie
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              Cuando compres tu primer regalo interactivo, vas a poder editar fotos, música y ver
              las visitas desde acá.
            </p>
            <div className="mt-6">
              <Link href="/galeria">
                <Button>Elegir una Boxie para regalar</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.boxies.map((boxie) => (
              <motion.div
                key={boxie.id}
                className="flex flex-col justify-between rounded-3xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-neutral-400">
                        {boxie.code}
                      </span>
                      <h3 className="font-display text-lg font-bold text-ink">{boxie.themeName}</h3>
                      <p className="text-xs text-neutral-600">
                        Para: <span className="font-semibold text-ink">{boxie.recipientName}</span>
                      </p>
                    </div>

                    {/* Badge de estado */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        boxie.status === 'opened'
                          ? 'bg-emerald-100 text-emerald-800'
                          : boxie.status === 'ready'
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {boxie.status === 'opened' ? (
                        <>
                          <PartyPopper className="size-3.5" /> ¡Abierta!
                        </>
                      ) : boxie.status === 'ready' ? (
                        <>
                          <Gift className="size-3.5" /> Lista
                        </>
                      ) : (
                        <>
                          <Edit3 className="size-3.5" /> En edición
                        </>
                      )}
                    </span>
                  </div>

                  {/* Métricas de apertura */}
                  <div className="mt-5 rounded-2xl bg-neutral-50 p-3.5 text-xs text-neutral-600">
                    {boxie.openCount > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                          <Eye className="size-4" /> Abierta {boxie.openCount}{' '}
                          {boxie.openCount === 1 ? 'vez' : 'veces'}
                        </span>
                        {boxie.firstOpenedAt && (
                          <span className="text-[11px] text-neutral-400">
                            Primera vez: {new Date(boxie.firstOpenedAt).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <Calendar className="size-3.5" /> Aún no fue abierta por el agasajado
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                  {boxie.giftUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(boxie.id, boxie.giftUrl!)}
                      className="gap-1.5 text-xs"
                    >
                      {copiedId === boxie.id ? (
                        <>
                          <Check className="size-3.5 text-emerald-600" /> ¡Link copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" /> Copiar link de regalo
                        </>
                      )}
                    </Button>
                  )}

                  <Link href={`/cuenta/boxies/${boxie.id}` as Route}>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-neutral-600">
                      Ver detalles <ExternalLink className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
