import { motionValue } from 'framer-motion'

/**
 * Cuánto está corrida hacia arriba la barra de navegación: 0 a la vista,
 * -110 escondida (al bajar se esconde, al subir vuelve). La mueve `Navbar`;
 * las barras que se pegan arriba en una página (los filtros de la galería) lo
 * leen para acomodarse debajo sin que se pisen.
 */
export const navbarOffset = motionValue(0)

/** Alto de la barra ya achicada al scrollear (px). */
export const NAVBAR_COMPACT_HEIGHT = 72
