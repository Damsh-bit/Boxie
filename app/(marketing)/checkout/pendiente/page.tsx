import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pago pendiente | Boxie',
  robots: { index: false },
}

export default function PendientePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-20">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <span className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-amber-50">
          <Clock className="size-10 text-amber-500" strokeWidth={1.5} />
        </span>
        <h1 className="mb-3 text-2xl font-bold text-ink">Tu pago está pendiente</h1>
        <p className="mb-2 leading-relaxed text-neutral-600">
          Mercado Pago está procesando tu pago. Esto puede tardar unas horas dependiendo del método
          elegido.
        </p>
        <p className="mb-8 flex items-center justify-center gap-2 text-sm text-neutral-500">
          <Mail className="size-4 shrink-0" />
          Te enviaremos un email en cuanto se confirme y podrás empezar a personalizar tu Boxie.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgb(244_78_99/0.35)] transition hover:brightness-110"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
