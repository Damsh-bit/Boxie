import { describe, expect, it } from 'vitest'
import { hasSandboxWork, isUntouched, remapPhotos } from './import-sandbox'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

describe('traer lo armado en la prueba', () => {
  it('una Boxie recién comprada está sin tocar', () => {
    expect(isUntouched({ recipientName: '', senderName: 'Lean', slides: {} })).toBe(true)
    expect(
      isUntouched({ recipientName: '', senderName: '', slides: { tapa: { titulo: 'Hola' } } }),
    ).toBe(false)
  })

  it('la prueba vale la pena si tiene nombres o fotos', () => {
    expect(hasSandboxWork(null)).toBe(false)
    expect(hasSandboxWork({ recipientName: '', senderName: '', slides: { x: { a: 1 } } })).toBe(
      false,
    )
    expect(hasSandboxWork({ recipientName: 'Sofi', senderName: '', slides: {} })).toBe(true)
    expect(
      hasSandboxWork({
        recipientName: '',
        senderName: '',
        slides: { f: { foto: { assetId: A } } },
      }),
    ).toBe(true)
  })

  it('cambia cada foto por la subida y deja vacías las que no se pudieron subir', () => {
    const draft = {
      recipientName: 'Sofi',
      senderName: 'Lean',
      slides: {
        tapa: { foto: { assetId: A }, titulo: 'Hola' },
        carrusel: { items: [{ foto: { assetId: B }, texto: 'uno' }, { foto: { assetId: C } }] },
      },
    }
    const next = remapPhotos(
      draft,
      new Map([
        [A, 'nueva-a'],
        [B, null],
        [C, 'nueva-c'],
      ]),
    )
    expect(next.slides.tapa).toEqual({ foto: { assetId: 'nueva-a' }, titulo: 'Hola' })
    expect(next.slides.carrusel).toEqual({
      items: [{ foto: null, texto: 'uno' }, { foto: { assetId: 'nueva-c' } }],
    })
    expect(next.recipientName).toBe('Sofi')
    // No toca el original.
    expect(draft.slides.tapa.foto.assetId).toBe(A)
  })
})
