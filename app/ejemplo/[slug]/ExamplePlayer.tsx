'use client'

import { motion } from 'framer-motion'
import { Gift, Wand2 } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { ButtonLink } from '@/ui/Button'
import { spring } from '@/ui/motion'
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
    <Player
      config={config}
      data={data}
      preview
      onClose={() => router.push(back)}
      footer={
        // Debajo del teléfono (no encima): no tapa los botones de las slides.
        <motion.div
          className="flex w-full max-w-md items-center gap-2 rounded-full bg-white/95 p-1.5 pl-4 text-sm shadow-xl backdrop-blur"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring.gentle, delay: 0.6 }}
        >
          <span className="hidden min-w-0 flex-1 truncate text-neutral-600 sm:inline">
            Boxie {name} de ejemplo
          </span>
          <ButtonLink
            href={`/ejemplo/${slug}/personalizar`}
            variant="ghost"
            size="sm"
            className="h-10 flex-1 sm:flex-none"
          >
            <Wand2 className="size-4" aria-hidden /> Personalizar
          </ButtonLink>
          <ButtonLink
            href={`/checkout?tematica=${slug}`}
            size="sm"
            className="h-10 flex-1 sm:flex-none"
          >
            <Gift className="size-4" aria-hidden /> Quiero la mía
          </ButtonLink>
        </motion.div>
      }
    />
  )
}
