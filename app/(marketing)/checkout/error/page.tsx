import type { Metadata } from 'next'
import Link from 'next/link'
import { XCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pago no completado | Boxie',
  robots: { index: false },
}

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }

export default async function ErrorPage({ searchParams }: Props) {
  const params = await searchParams
  const razon = typeof params.razon === 'string' ? params.razon : null

  const mensaje =
    razon === 'pago-rechazado'
      ? 'Tu pago fue rechazado por Mercado Pago. Podés intentarlo de nuevo con otra tarjeta o método de pago.'
      : 'Hubo un problema al procesar tu pago. No se realizó ningún cobro.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-20">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <span className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-red-50">
          <XCircle className="size-10 text-red-500" strokeWidth={1.5} />
        </span>
        <h1 className="mb-3 text-2xl font-bold text-ink">Algo salió mal</h1>
        <p className="mb-8 leading-relaxed text-neutral-600">{mensaje}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/galeria"
            className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgb(244_78_99/0.35)] transition hover:brightness-110"
          >
            Volver a elegir temática
          </Link>
          <Link
            href="/ayuda"
            className="text-sm text-neutral-500 underline-offset-2 hover:underline"
          >
            ¿Necesitás ayuda?
          </Link>
        </div>
      </div>
    </div>
  )
}
