/**
 * Textos y ayudas de la galería (/galeria).
 *
 * `searchHints` son palabras con las que la gente busca cada temática aunque
 * no aparezcan en su ficha ("novia" encuentra Pareja, "perro" encuentra
 * Mascotas). Una temática nueva del panel se encuentra igual por su nombre,
 * su categoría, su descripción y sus fechas; esto solo suma sinónimos.
 */
export const searchHints: Record<string, string> = {
  pareja: 'novia novio esposa esposo marido mujer amor aniversario mesiversario romantico te amo',
  cumpleanos: 'cumple feliz dia fiesta torta velitas saludo grupal',
  amistad: 'amigo amiga mejor amiga mejor amigo bff team grupo gracias agradecer',
  'dia-de-la-madre': 'mama madre vieja mami familia',
  mascotas: 'perro perrito gato gatito michi mascota',
  navidad: 'navidad fiestas familia fin de año',
  halloween: 'halloween terror disfraz',
  gamer: 'gamer juegos videojuegos consola',
}

/** Lo que se sugiere buscar cuando el buscador está vacío. */
export const searchSuggestions = [
  'Aniversario',
  'Mamá',
  'Día del Amigo',
  'Cumple',
  'A distancia',
  'Mascota',
]

/** Los textos de ordenar (la lógica vive en `domain/gallery`). */
export const sortLabels = {
  recomendadas: 'Recomendadas',
  fecha: 'Fecha más cercana',
  az: 'De la A a la Z',
} as const
