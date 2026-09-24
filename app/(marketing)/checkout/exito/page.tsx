import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Compra exitosa | Boxie',
  robots: { index: false },
}

/** Fallback para cuando la Boxie ya fue creada en un proceso anterior (pago idempotente). */
export default function ExitoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-20">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <span className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="size-10 text-green-500" strokeWidth={1.5} />
        </span>
        <h1 className="mb-3 text-2xl font-bold text-ink">¡Compra realizada!</h1>
        <p className="mb-8 leading-relaxed text-neutral-600">
          Tu pago fue procesado correctamente. Revisá tu email: ahí encontrás el link para
          personalizar tu Boxie.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgb(244_78_99/0.35)] transition hover:brightness-110"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
