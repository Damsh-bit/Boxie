'use client'

import { createContext, useContext } from 'react'
import type { StyleValues } from './styles'

/**
 * El estilo de la slide que se está dibujando, para las piezas que no reciben
 * el contexto de la slide (el escenario de Ribbly pinta la paleta, la
 * tipografía y la decoración a partir de esto).
 */
export const SlideStyleContext = createContext<StyleValues>({})

export function useSlideStyle(): StyleValues {
  return useContext(SlideStyleContext)
}
