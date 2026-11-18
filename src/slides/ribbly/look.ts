'use client'

import { useSlideStyle } from '../style-context'
import { ORIGINAL, paletteOf, typePairOf, type RbPalette, type RbTypePair } from './style-kit'

/**
 * El estilo elegido para la pantalla, ya resuelto en datos de dibujo. Las
 * piezas lo leen para pintarse con la paleta elegida; con `original` (lo de
 * siempre) no cambian nada.
 */

/** La paleta elegida, o null si va la del diseño. */
export function useRbPalette(): RbPalette | null {
  return paletteOf(useSlideStyle().paleta)
}

/** La tipografía elegida, o null si va la del diseño. */
export function useRbType(): RbTypePair | null {
  return typePairOf(useSlideStyle().tipo)
}

/** La opción elegida en un eje propio de la pantalla (`torta`, `globos`…). */
export function usePiece(axis: string, fallback: string = ORIGINAL): string {
  return useSlideStyle()[axis] || fallback
}

/** Colores de confeti: los de la paleta elegida o los del diseño. */
export function usePartyColors(colors: string[]): string[] {
  return useRbPalette()?.party ?? colors
}
