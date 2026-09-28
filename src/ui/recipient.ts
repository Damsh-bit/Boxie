'use client'

import { cleanRecipient } from '@/domain/recipient'

/**
 * El nombre de quien recibe la Boxie, tal como lo escribieron en la home
 * ("¿Para quién es?"). Viaja por la ficha y el checkout (?para=Sofi) y queda
 * guardado en el navegador para que el editor, después de pagar, ya lo tenga
 * cargado: no se vuelve a pedir lo que la persona ya escribió.
 */

const KEY = 'bx-para'
const DAYS = 30

export function rememberRecipient(value: string | null | undefined) {
  const name = cleanRecipient(value)
  if (!name) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, at: Date.now() }))
  } catch {
    // Sin almacenamiento: el nombre igual viaja en la URL.
  }
}

export function rememberedRecipient(): string {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
      name: string
      at: number
    } | null
    if (!saved || Date.now() - saved.at > DAYS * 86_400_000) return ''
    return cleanRecipient(saved.name)
  } catch {
    return ''
  }
}
