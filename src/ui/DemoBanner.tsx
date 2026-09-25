'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FlaskConical, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { spring } from './motion'

const KEY = 'boxie:aviso-demo'

/**
 * Aviso del modo demo. Aparece solo, se puede cerrar (por esta sesión) y
 * mientras está a la vista publica su alto en `--dock` para que las barras
 * fijas de abajo (como la de comprar en el celular) se acomoden encima.
 */
export function DemoBanner() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(KEY) === '1'
    } catch {
      // sin storage (modo privado estricto): se muestra igual
    }
    if (dismissed) return
    const timer = window.setTimeout(() => setVisible(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (!visible || !el) {
      root.style.removeProperty('--dock')
      return
    }
    const sync = () => root.style.setProperty('--dock', `${el.offsetHeight + 12}px`)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--dock')
    }
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // nada que hacer
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={ref}
          role="note"
          className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-ink/95 py-2.5 pr-2 pl-4 text-left text-xs leading-snug text-white shadow-[0_12px_40px_rgba(42,36,51,0.35)] backdrop-blur sm:text-[0.8rem]"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96, transition: { duration: 0.2 } }}
          transition={spring.gentle}
        >
          <FlaskConical className="size-4 shrink-0 text-brand-muted" aria-hidden />
          <p className="flex-1">
            <strong className="font-semibold">Versión de demostración:</strong> los precios son de
            referencia y el cobro todavía está desactivado.
          </p>
          <motion.button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar aviso"
            className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            whileTap={{ scale: 0.85 }}
          >
            <X className="size-4" aria-hidden />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
