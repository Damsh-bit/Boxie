import type { PurchaseExample } from '@/domain/social-proof'

/**
 * La cinta de compras de la portada ("María acaba de comprar una Boxie").
 *
 * Muestra las ventas reales de los últimos `windowDays` días (solo el nombre
 * de pila, la temática y hace cuánto). Mientras sean menos de
 * `examplesUntil`, la completan los ejemplos de abajo; con suficientes ventas
 * reales los ejemplos dejan de salir solos. Los ejemplos son inventados:
 * `examplesUntil: 0` los apaga del todo.
 */
export const socialProof = {
  windowDays: 14,
  examplesUntil: 8,
  /** Compras que pasan por la cinta antes de volver a empezar. */
  max: 24,
  /** El contador "+500 Boxies regaladas" aparece recién desde esta cantidad de ventas. */
  soldFrom: 100,
}

/** Bajada de una venta real según su temática (no sabemos para quién era). */
export const themeDetail: Record<string, string> = {
  pareja: 'para su pareja',
  cumpleanos: 'para un cumpleaños',
  amistad: 'para una gran amistad',
}

/** Ejemplos de relleno: nombres, destinatarios y temáticas variados, así no se repite. */
export const purchaseExamples: readonly PurchaseExample[] = [
  { name: 'María', detail: 'para su mejor amiga', theme: 'amistad' },
  { name: 'Lucas', detail: 'para su novia', theme: 'pareja' },
  { name: 'Florencia', detail: 'para el cumple de su mamá', theme: 'cumpleanos' },
  { name: 'Joaquín', detail: 'para su novia a distancia', theme: 'pareja' },
  { name: 'Camila', detail: 'para su hermana', theme: 'cumpleanos' },
  { name: 'Tomás', detail: 'por su aniversario', theme: 'pareja' },
  { name: 'Abril', detail: 'para el cumple de su abuela', theme: 'cumpleanos' },
  { name: 'Nicolás', detail: 'para su mejor amigo', theme: 'amistad' },
  { name: 'Julieta', detail: 'para su novio', theme: 'pareja' },
  { name: 'Martín', detail: 'para su papá', theme: 'cumpleanos' },
  { name: 'Rocío', detail: 'para agradecerle a su amiga', theme: 'amistad' },
  { name: 'Santiago', detail: 'por sus 6 meses juntos', theme: 'pareja' },
  { name: 'Agustina', detail: 'para su grupo de amigas', theme: 'amistad' },
  { name: 'Valentina', detail: 'para su novio en Madrid', theme: 'pareja' },
  { name: 'Franco', detail: 'por el cumple de su hermano', theme: 'cumpleanos' },
  { name: 'Milagros', detail: 'para su mamá', theme: 'cumpleanos' },
  { name: 'Bruno', detail: 'para sorprender a su novia', theme: 'pareja' },
  { name: 'Candela', detail: 'para su amiga que se muda', theme: 'amistad' },
  { name: 'Ignacio', detail: 'por el cumple de su novia', theme: 'cumpleanos' },
  { name: 'Lucía', detail: 'para sus abuelos', theme: 'cumpleanos' },
  { name: 'Mateo', detail: 'para su amigo del alma', theme: 'amistad' },
  { name: 'Paula', detail: 'por sus 10 años de casados', theme: 'pareja' },
  { name: 'Emiliano', detail: 'para su mamá', theme: 'cumpleanos' },
  { name: 'Belén', detail: 'para su prima', theme: 'cumpleanos' },
  { name: 'Micaela', detail: 'para su compañera de facu', theme: 'amistad' },
  { name: 'Lautaro', detail: 'por San Valentín', theme: 'pareja' },
]
