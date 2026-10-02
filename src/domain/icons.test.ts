import { describe, expect, it } from 'vitest'
import { ICON_LABELS, iconFor, splitEmoji, stripEmoji } from './icons'

describe('iconFor', () => {
  it('acepta nombres de ícono y emojis', () => {
    expect(iconFor('regalo')).toBe('regalo')
    expect(iconFor('🎁')).toBe('regalo')
    expect(iconFor(' ❤️ ')).toBe('corazon')
  })

  it('ignora tonos de piel y secuencias ZWJ', () => {
    expect(iconFor('👯‍♀️')).toBe('amigas')
    expect(iconFor('💆‍♂️')).toBe('masaje')
    expect(iconFor('💪🏽')).toBe('fuerza')
  })

  it('devuelve null si no hay ícono o hay más de un emoji', () => {
    expect(iconFor('🦄')).toBeNull()
    expect(iconFor('🎁🎁')).toBeNull()
    expect(iconFor('chau')).toBeNull()
    expect(iconFor('')).toBeNull()
    expect(iconFor(null)).toBeNull()
  })

  it('cada ícono tiene etiqueta', () => {
    expect(Object.keys(ICON_LABELS)).toHaveLength(102)
  })
})

describe('splitEmoji', () => {
  it('reemplaza solo los emojis con ícono', () => {
    expect(splitEmoji('Carta para vos 💌')).toEqual([
      'Carta para vos ',
      { icon: 'carta-de-amor', emoji: '💌' },
    ])
    expect(splitEmoji('Te quiero 🦄')).toEqual(['Te quiero 🦄'])
  })

  it('deja los símbolos tipográficos', () => {
    expect(splitEmoji('© 2026 ✓ listo ✦')).toEqual(['© 2026 ✓ listo ✦'])
  })
})

describe('stripEmoji', () => {
  it('saca los emojis y acomoda los espacios', () => {
    expect(stripEmoji('¡Hola Sofía! ✨')).toBe('¡Hola Sofía!')
    expect(stripEmoji('Hola Ribbly 👋 Tengo una consulta')).toBe('Hola Ribbly Tengo una consulta')
    expect(stripEmoji('🔐 Le puse clave 😉')).toBe('Le puse clave')
    expect(stripEmoji('recuerdos 🎁❤️\nChau')).toBe('recuerdos\nChau')
  })

  it('respeta © y ™', () => {
    expect(stripEmoji('Ribbly™ © 2026')).toBe('Ribbly™ © 2026')
  })
})

describe('nombres de ícono', () => {
  it('entran en los campos de emoji (máximo 16 caracteres)', () => {
    for (const name of Object.keys(ICON_LABELS)) expect(name.length).toBeLessThanOrEqual(16)
  })
})
