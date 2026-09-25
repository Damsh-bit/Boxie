'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Gift, Wand2 } from 'lucide-react'
import type { Route } from 'next'
import { useEffect, useState } from 'react'
import { ButtonLink } from '@/ui/Button'
import { spring } from '@/ui/motion'

/**
 * Barra de compra fija en el celular: aparece cuando el armador de la portada
 * sale de pantalla y se va al llegar al cierre (que ya tiene sus botones).
 * Respeta el aviso de demo (`--dock`), igual que la de la ficha.
 */
export function StickyBuyBar({
  price,
  salesPaused = false,
  editorHref,
}: {
  /** "Desde $ 3.490" o "$ 4.990". */
  price: string
  /** Con las ventas pausadas desde el panel, invita a probar el editor. */
  salesPaused?: boolean
  editorHref: Route
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const start = document.getElementById('armador')
    const end = document.getElementById('cierre')
    if (!start || !end) return
    let passed = false
    let arrived = false
    const update = () => setShow(passed && !arrived)
    const startObserver = new IntersectionObserver(([entry]) => {
      passed = !entry!.isIntersecting && entry!.boundingClientRect.top < 0
      update()
    })
    const endObserver = new IntersectionObserver(([entry]) => {
      arrived = entry!.isIntersecting || entry!.boundingClientRect.top < 0
      update()
    })
    startObserver.observe(start)
    endObserver.observe(end)
    return () => {
      startObserver.disconnect()
      endObserver.disconnect()
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-3 z-30 lg:hidden"
          style={{ bottom: 'calc(var(--dock) + 12px)' }}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={spring.gentle}
        >
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-[22px] bg-white/95 p-2 pl-4 shadow-[0_18px_50px_rgba(42,36,51,0.22)] ring-1 ring-black/5 backdrop-blur">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-neutral-500">
                {salesPaused ? 'Ventas pausadas por un rato' : 'Regalo digital · llega al instante'}
              </p>
              <p className="truncate font-display text-xl font-bold text-ink">
                {salesPaused ? 'Probala gratis' : price}
              </p>
            </div>
            {salesPaused ? (
              <ButtonLink href={editorHref} size="md" className="px-5">
                <Wand2 className="size-4" aria-hidden /> Probar
              </ButtonLink>
            ) : (
              <ButtonLink href="/galeria" size="md" className="px-5">
                <Gift className="size-4" aria-hidden /> Regalar
              </ButtonLink>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
