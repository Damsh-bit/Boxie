/**
 * Respuestas rápidas del soporte (panel → Soporte → ⚡). `{nombre}` se
 * reemplaza por el nombre de pila del cliente. Se editan acá: son las que
 * más se repiten; el resto se escribe a mano.
 */
export const QUICK_REPLIES = [
  {
    id: 'saludo',
    label: 'Saludo',
    text: '¡Hola {nombre}! Gracias por escribirnos. Ya lo estamos revisando y te respondemos por acá 🙌',
  },
  {
    id: 'codigo',
    label: 'Pedir el código',
    text: '¿Me pasás el código de tu Boxie? Está en el mail de la compra (tiene esta forma: K7M2-Q9XD).',
  },
  {
    id: 'link',
    label: 'Reenviamos el link',
    text: 'Listo {nombre}: te reenviamos el link para editar tu Boxie al mail de la compra. Si no lo ves en unos minutos, revisá spam o promociones. El link anterior deja de funcionar.',
  },
  {
    id: 'pago',
    label: 'Pago pendiente',
    text: 'Con algunos medios de pago, Mercado Pago tarda unas horas en acreditar. Apenas se acredite te llega el mail con el acceso. Si pasan más de 24 h, avisanos por acá.',
  },
  {
    id: 'clave',
    label: 'Clave del regalo',
    text: 'Si le pusiste clave al regalo, la tiene que ingresar quien lo recibe (vos se la pasás). Antes de bloquearla podés cambiarla o sacarla desde el editor.',
  },
  {
    id: 'navegador',
    label: 'Probar otro navegador',
    text: '¿Podés probar desde otro navegador (Chrome o Safari actualizados) y contarnos si pasa lo mismo? Si podés, mandanos una captura de pantalla.',
  },
  {
    id: 'cierre',
    label: 'Cierre',
    text: '¡Genial, {nombre}! Cualquier otra cosa, escribinos por acá. ¡Que la disfruten! 💖',
  },
] as const

/** El texto con el nombre del cliente. */
export function fillReply(text: string, customerName: string): string {
  const first = customerName.trim().split(/\s+/)[0] ?? ''
  return text.replaceAll('{nombre}', first).replace(/\s{2,}/g, ' ')
}
