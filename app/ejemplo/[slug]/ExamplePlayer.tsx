'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ParsedThemeConfig } from '@/slides/config'
import { Player, type PlayerData } from '@/slides/player/Player'

export function ExamplePlayer({
  config,
  data,
  slug,
  name,
}: {
  config: ParsedThemeConfig
  data: PlayerData
  slug: string
  name: string
}) {
  const router = useRouter()
  const back = `/tematicas/${slug}` as Route
  return (
    <>
      <Player config={config} data={data} preview onClose={() => router.push(back)} />
      <div className="fixed inset-x-0 bottom-3 z-[10000] flex justify-center px-3">
        <div className="flex items-center gap-3 rounded-full bg-white/95 py-2 pr-2 pl-4 text-sm shadow-xl backdrop-blur">
          <span className="hidden text-neutral-600 sm:inline">Boxie {name} de ejemplo</span>
          <Link
            href={`/ejemplo/${slug}/personalizar` as Route}
            className="rounded-full px-3 py-2 font-semibold text-ink hover:bg-neutral-100"
          >
            Personalizar
          </Link>
          <Link
            href={`/checkout?tematica=${slug}` as Route}
            className="rounded-full bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
          >
            Quiero la mía
          </Link>
        </div>
      </div>
    </>
  )
}
