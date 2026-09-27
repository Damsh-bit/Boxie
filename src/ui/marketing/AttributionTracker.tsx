'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { recordPageView } from './attribution-client'

/** Páginas que no son de la tienda: el panel, el editor del comprador y el regalo. */
const EXCLUDED = /^\/(admin|editor|g|soporte|api)(\/|$)/

/**
 * Mide cada página vista de la tienda (origen de la visita y pasos del
 * embudo). No dibuja nada. Va en el layout raíz dentro de un <Suspense>
 * (useSearchParams lo pide para no volver dinámicas las páginas estáticas).
 */
export function AttributionTracker() {
  const pathname = usePathname()
  const params = useSearchParams()
  const first = useRef(true)
  const search = params.toString()

  useEffect(() => {
    const firstLoad = first.current
    first.current = false
    if (EXCLUDED.test(pathname)) return
    recordPageView(pathname, search ? `?${search}` : '', firstLoad)
  }, [pathname, search])

  return null
}
