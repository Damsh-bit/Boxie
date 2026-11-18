import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'
import { NotFoundContent } from '@/ui/NotFoundContent'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false },
}

/**
 * 404 de cualquier dirección que no existe. Va fuera del marco del sitio
 * (no hay layout de marketing acá): lleva su propio logo para volver.
 */
export default async function NotFound() {
  // Se renderiza por pedido, no en el build: una página estática no puede
  // llevar el nonce de la CSP y sus scripts quedarían bloqueados.
  await connection()
  return (
    <main className="flex-1 bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_55%)]">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-[90px] w-[90%] max-w-6xl items-center">
          <Link href="/" aria-label="Ribbly, inicio">
            <Image
              src="/brand/ribbly-logo.png"
              alt="Ribbly"
              width={74}
              height={52}
              className="h-[52px] w-auto"
            />
          </Link>
        </div>
      </header>
      <NotFoundContent />
    </main>
  )
}
