import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NotFoundContent } from '@/ui/NotFoundContent'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false },
}

/**
 * 404 de cualquier dirección que no existe. Va fuera del marco del sitio
 * (no hay layout de marketing acá): lleva su propio logo para volver.
 */
export default function NotFound() {
  return (
    <main className="flex-1 bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_55%)]">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-[90px] w-[90%] max-w-6xl items-center">
          <Link href="/" aria-label="Boxie, inicio">
            <Image
              src="/brand/boxie-logo.png"
              alt="Boxie"
              width={129}
              height={45}
              className="h-[45px] w-auto"
            />
          </Link>
        </div>
      </header>
      <NotFoundContent />
    </main>
  )
}
