import { DatabaseZap } from 'lucide-react'
import Link from 'next/link'
import { Card } from '../../../_ui/primitives'

/**
 * La base real todavía no tiene las tablas de marketing: se ve lo que sale
 * de las ventas (economía por venta, CAC combinado, LTV) y se explica qué
 * falta para medir canales, campañas y visitas.
 */
export function SchemaNotice() {
  return (
    <Card className="mb-5 border-dashed border-[#c9a100]/60 bg-gold/5" padded={false}>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-[#7a5800]">
          <DatabaseZap className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-ink">Falta la parte de marketing en la base</p>
          <p className="mt-0.5 text-neutral-600">
            Hasta aplicar la migración{' '}
            <code className="rounded bg-white px-1">20260927120000_marketing.sql</code> no se
            guardan campañas, inversión ni el origen de las visitas. Lo que sale de las ventas
            (costo por venta combinado, economía de una Boxie, LTV) ya se ve.
          </p>
        </div>
        <Link
          href="/admin/sistema"
          className="shrink-0 text-sm font-semibold text-brand hover:underline"
        >
          Ver qué falta
        </Link>
      </div>
    </Card>
  )
}
