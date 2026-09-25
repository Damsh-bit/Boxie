/**
 * Puente para abrir el chat de soporte (el botón flotante) desde cualquier
 * parte del sitio: "Abrir el chat" en la ayuda, "Reportar un error" en una
 * página de error, "Necesito ayuda" en el editor. El widget escucha el
 * evento; si en esa página no está montado, se va a /soporte.
 */

export type SupportTopic = 'boxie' | 'error' | 'pago' | 'otro'

export interface OpenSupportDetail {
  topic?: SupportTopic
  /** Código de la Boxie ("K7M2-Q9XD"), si se sabe. */
  boxieCode?: string
  /** Un primer mensaje sugerido. */
  message?: string
}

export const SUPPORT_EVENT = 'boxie:soporte'

declare global {
  interface Window {
    /** Lo marca el widget al montarse. */
    __boxieSupport?: boolean
  }
}

/** Abre el chat. Devuelve false si el widget no está en esta página. */
export function openSupport(detail: OpenSupportDetail = {}): boolean {
  if (typeof window === 'undefined' || !window.__boxieSupport) return false
  window.dispatchEvent(new CustomEvent<OpenSupportDetail>(SUPPORT_EVENT, { detail }))
  return true
}

/** La página de soporte con el formulario abierto en ese tema (sin el widget). */
export function supportPageHref(detail: OpenSupportDetail = {}): string {
  const params = new URLSearchParams({ nuevo: '1' })
  if (detail.topic) params.set('tema', detail.topic)
  if (detail.boxieCode) params.set('codigo', detail.boxieCode)
  return `/soporte?${params.toString()}`
}
