import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { slideDefinitions } from '../schemas'
import type { MediaAdapter } from './PhotoField'
import { SchemaForm } from './SchemaForm'

/**
 * El formulario sale del schema: estos tests renderizan los de las slides
 * reales del comprador y verifican lo que tiene que aparecer, sin escribir
 * ningún formulario a mano.
 */

const PHOTO = { assetId: '5a5a5a5a-1111-4111-8111-111111111111' }
const media: MediaAdapter = {
  upload: async () => ({ ok: false, error: 'no en tests' }),
  resolve: (ref) => (ref ? `https://fotos.test/${ref.assetId}.webp` : undefined),
}

function render(kind: keyof typeof slideDefinitions, value: unknown, withMedia = true) {
  const schema = slideDefinitions[kind].buyerSchema as z.ZodType
  return renderToStaticMarkup(
    <SchemaForm
      schema={schema}
      value={value}
      onChange={() => {}}
      idPrefix="t"
      media={withMedia ? media : undefined}
    />,
  )
}

describe('SchemaForm', () => {
  it('dedicatoria: mensaje con contador y foto obligatoria', () => {
    const html = render('story.dedication', { text: 'Hola', photo: null })
    expect(html).toContain('Mensaje')
    expect(html).toContain('maxLength="250"')
    expect(html).toContain('4/250')
    expect(html).toContain('Foto de la dedicatoria')
    expect(html).toContain('aria-label="obligatorio"')
    expect(html).toContain('Subir foto')
  })

  it('una foto cargada se ve con su miniatura y se puede cambiar', () => {
    const html = render('story.dedication', { text: '', photo: PHOTO })
    expect(html).toContain('✓ Foto cargada')
    expect(html).toContain(`src="https://fotos.test/${PHOTO.assetId}.webp"`)
    expect(html).toContain('Cambiar')
  })

  it('10 razones: un campo por razón y sin botón de agregar cuando está completa', () => {
    const reasons = Array.from({ length: 10 }, (_, i) => `Razón ${i + 1}`)
    const html = render('story.reasons', { reasons })
    for (let n = 1; n <= 10; n++) expect(html).toContain(`aria-label="Razón #${n}"`)
    expect(html).toContain('10/10')
    expect(html).not.toContain('Agregar')
  })

  it('cuponera: cada vale es un grupo con sus campos y se pueden agregar más', () => {
    const html = render('game.coupons', { coupons: [{ title: 'Cena', detail: '' }] })
    expect(html).toContain('Vale 1')
    expect(html).toContain('Detalle (opcional)')
    expect(html).toContain('Agregar vale')
    expect(html).toContain('aria-label="Quitar Vale 1"')
  })

  it('canción: link de YouTube con vista previa cuando es válido', () => {
    const html = render('media.song', { youtubeUrl: 'https://youtu.be/450p7goxZqg', songTitle: '' })
    expect(html).toContain('i.ytimg.com/vi/450p7goxZqg')
    expect(html).toContain('Video de YouTube listo')
  })

  it('sin forma de subir fotos, lo avisa en vez de mostrar el botón', () => {
    const html = render('story.anecdote', {}, false)
    expect(html).toContain('Las fotos se cargan desde el editor')
  })
})
