'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import type { ParsedThemeConfig } from '@/slides/config'
import { useCalm } from '@/ui/motion'

/** Un bloque del esqueleto con brillo que lo cruza (transform, en el compositor). */
function Bone({ className }: { className: string }) {
  const calm = useCalm()
  return (
    <div className={`relative overflow-hidden bg-neutral-200/70 ${className}`}>
      <motion.div
        className="absolute inset-y-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)] motion-reduce:hidden"
        style={{ transform: 'translateX(-100%)' }}
        animate={calm ? undefined : { transform: ['translateX(-100%)', 'translateX(250%)'] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

/** Mientras carga el editor: su forma, para que la espera se sienta corta. */
function EditorSkeleton() {
  return (
    <motion.div
      className="min-h-dvh bg-[#f7f5f6]"
      role="status"
      aria-label="Preparando el editor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="h-16 border-b border-neutral-200/70 bg-white" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="space-y-3 rounded-3xl bg-white p-6 sm:p-8">
            <Bone className="h-3 w-40 rounded-full" />
            <Bone className="h-8 w-3/4 rounded-xl" />
            <Bone className="h-4 w-full rounded-full" />
            <Bone className="mt-4 h-2.5 w-full rounded-full" />
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-3xl bg-white p-5">
              <Bone className="size-11 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-1/3 rounded-full" />
                <Bone className="h-3 w-2/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <Bone className="mx-auto mt-9 aspect-[9/19] h-[min(700px,calc(100dvh-9rem))] rounded-[32px]" />
        </div>
      </div>
      <span className="sr-only">Preparando el editor…</span>
    </motion.div>
  )
}

// El modo prueba guarda en el navegador (localStorage): se monta solo del lado del cliente.
const SandboxEditor = dynamic(
  () => import('@/slides/editor/SandboxEditor').then((m) => m.SandboxEditor),
  { ssr: false, loading: () => <EditorSkeleton /> },
)

export function SandboxLoader(props: {
  config: ParsedThemeConfig
  theme: { name: string; slug: string }
  lifetimeDays: number
}) {
  return <SandboxEditor {...props} />
}
