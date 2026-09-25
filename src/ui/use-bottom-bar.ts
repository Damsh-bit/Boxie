'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Una barra fija abajo (comprar en el celular, la del editor) publica su alto
 * en `--bar` mientras se ve: lo que flota abajo (el botón de ayuda) se sube
 * para no quedar tapado. Si la barra está oculta (en escritorio, por
 * ejemplo), no ocupa nada.
 */
export function useBottomBar(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    const el = ref.current
    if (!active || !el) return
    const root = document.documentElement
    const sync = () => {
      const height = el.offsetHeight
      if (height > 0) root.style.setProperty('--bar', `${height + 12}px`)
      else root.style.removeProperty('--bar')
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--bar')
    }
  }, [ref, active])
}
