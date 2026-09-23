'use client'

import { LoaderCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ParsedThemeConfig } from '@/slides/config'

// El modo prueba guarda en el navegador (localStorage): se monta solo del lado del cliente.
const SandboxEditor = dynamic(
  () => import('@/slides/editor/SandboxEditor').then((m) => m.SandboxEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f5f6] text-neutral-500">
        <LoaderCircle className="mr-2 size-5 animate-spin text-brand" aria-hidden /> Preparando el
        editor…
      </div>
    ),
  },
)

export function SandboxLoader(props: {
  config: ParsedThemeConfig
  theme: { name: string; slug: string }
  lifetimeDays: number
}) {
  return <SandboxEditor {...props} />
}
