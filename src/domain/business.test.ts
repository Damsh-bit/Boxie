import { describe, expect, it } from 'vitest'
import { businessContact, instagramHandle, whatsappNumber, whatsappUrl } from './business'

describe('whatsapp', () => {
  it('acepta el número como lo escribe una persona', () => {
    expect(whatsappNumber('+54 9 11 5555-0100')).toBe('5491155550100')
    expect(whatsappNumber('+1 (415) 555-0100')).toBe('14155550100')
  })

  it('completa un número argentino sin código de país', () => {
    expect(whatsappNumber('11 5555-0100')).toBe('5491155550100')
    expect(whatsappNumber('011 5555-0100')).toBe('5491155550100')
    expect(whatsappNumber('549 11 5555 0100')).toBe('5491155550100')
  })

  it('rechaza lo que no alcanza para ser un teléfono', () => {
    expect(whatsappNumber('')).toBeNull()
    expect(whatsappNumber('   ')).toBeNull()
    expect(whatsappNumber('5555')).toBeNull()
    expect(whatsappNumber('+54 9 11 5555 0100 0000 000')).toBeNull()
  })

  it('arma el link con el mensaje codificado', () => {
    expect(whatsappUrl('+54 9 11 5555-0100', 'Hola & chau')).toBe(
      'https://wa.me/5491155550100?text=Hola%20%26%20chau',
    )
    expect(whatsappUrl('nada')).toBeNull()
  })
})

describe('instagram', () => {
  it('saca la cuenta de cualquier forma de escribirla', () => {
    expect(instagramHandle('@boxie.app')).toBe('boxie.app')
    expect(instagramHandle('Boxie.App')).toBe('boxie.app')
    expect(instagramHandle('https://www.instagram.com/boxie.app/')).toBe('boxie.app')
    expect(instagramHandle('instagram.com/boxie_app?igsh=abc')).toBe('boxie_app')
  })

  it('rechaza lo que no es una cuenta', () => {
    expect(instagramHandle('')).toBeNull()
    expect(instagramHandle('boxie app')).toBeNull()
    expect(instagramHandle('@'.padEnd(40, 'x'))).toBeNull()
  })
})

describe('businessContact', () => {
  it('deja afuera los canales vacíos o inválidos', () => {
    const contact = businessContact({
      name: '  ',
      supportEmail: ' ayuda@boxie.test ',
      whatsapp: '',
      instagram: 'no es una cuenta',
    })
    expect(contact).toEqual({
      name: 'Boxie Digital',
      supportEmail: 'ayuda@boxie.test',
      whatsapp: null,
      instagram: null,
    })
  })

  it('muestra el número como se cargó y linkea al número limpio', () => {
    const contact = businessContact(
      {
        name: 'Boxie',
        supportEmail: 'ayuda@boxie.test',
        whatsapp: '+54 9 11 5555-0100',
        instagram: '@boxie.app',
      },
      'Hola',
    )
    expect(contact.whatsapp).toEqual({
      display: '+54 9 11 5555-0100',
      url: 'https://wa.me/5491155550100?text=Hola',
    })
    expect(contact.instagram).toEqual({
      handle: '@boxie.app',
      url: 'https://instagram.com/boxie.app',
    })
  })
})
