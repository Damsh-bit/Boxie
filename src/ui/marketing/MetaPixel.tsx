'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { META_PIXEL_ID, metaTrack } from './meta-pixel'

const EXCLUDED = /^\/(admin|editor|g|soporte|api)(\/|$)/

/**
 * Cuenta cada página vista de la tienda en el píxel de Meta y, en la ficha de
 * una temática, "ViewContent". Sin ID configurado (o con "no rastrear") no
 * carga nada. El panel, el editor y el regalo no se miden: ahí hay datos
 * personales.
 */
export function MetaPixel() {
  const pathname = usePathname()
  useEffect(() => {
    if (!META_PIXEL_ID || EXCLUDED.test(pathname)) return
    metaTrack('PageView')
    const theme = /^\/tematicas\/([a-z0-9-]+)/.exec(pathname)?.[1]
    if (theme) metaTrack('ViewContent', { content_ids: [theme], content_type: 'product' })
  }, [pathname])
  return null
}
