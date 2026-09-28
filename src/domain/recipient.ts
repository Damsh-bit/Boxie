/**
 * El nombre de quien recibe la Boxie, tal como lo escriben en la home o llega
 * en un link (?para=Sofi): sin caracteres raros ni espacios de más.
 */
export function cleanRecipient(value: string | string[] | null | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? '')
    .replace(/[\p{Cc}<>]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

/** "Quiero la Boxie de Sofi" solo si el nombre es corto (si no, el botón se rompe). */
export function shortRecipient(name: string, max = 12): string | null {
  return name && name.length <= max ? name : null
}
