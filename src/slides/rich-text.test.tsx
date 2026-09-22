import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RichText } from './RichText'
import { accent, br, markupToRich, rich, richToMarkup, richToPlain, RichTextSchema } from './rich-text'

const quienEresTu = rich('¿Quién', br, accent('eres tú'), br, 'para mí?')

describe('RichText', () => {
  it('reproduce el título editorial del prototipo sin JSX en los datos', () => {
    expect(renderToStaticMarkup(<RichText value={quienEresTu} marks={{ accent: '' }} />)).toBe(
      '¿Quién<br/><span class="">eres tú</span><br/>para mí?',
    )
  })

  it('sobrevive a JSON.stringify y valida', () => {
    const roundTrip = JSON.parse(JSON.stringify(quienEresTu))
    expect(RichTextSchema.parse(roundTrip)).toEqual(quienEresTu)
  })

  it('no interpreta HTML: el contenido se escapa', () => {
    const html = renderToStaticMarkup(<RichText value={rich('<img src=x onerror=alert(1)>')} />)
    expect(html).toBe('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('rechaza nodos desconocidos', () => {
    expect(RichTextSchema.safeParse({ t: 'rich', v: [{ html: '<b>x</b>' }] }).success).toBe(false)
  })

  it('acepta texto plano', () => {
    expect(renderToStaticMarkup(<RichText value="hola" />)).toBe('hola')
    expect(richToPlain(quienEresTu)).toBe('¿Quién\neres tú\npara mí?')
  })
})

describe('notación de texto del panel', () => {
  it('convierte ida y vuelta', () => {
    const markup = richToMarkup(quienEresTu)
    expect(markup).toBe('¿Quién\n*eres tú*\npara mí?')
    expect(markupToRich(markup)).toEqual(quienEresTu)
  })

  it('soporta todas las marcas', () => {
    expect(markupToRich('**Sos** ==mi lugar seguro== y _mi_ *todo*').v).toEqual([
      { text: 'Sos', mark: 'bold' },
      { text: ' ' },
      { text: 'mi lugar seguro', mark: 'highlight' },
      { text: ' y ' },
      { text: 'mi', mark: 'italic' },
      { text: ' ' },
      { text: 'todo', mark: 'accent' },
    ])
  })

  it('deja literal un marcador sin cerrar y respeta los escapes', () => {
    expect(richToPlain(markupToRich('5 * 3 = 15'))).toBe('5 * 3 = 15')
    const tricky = rich('a*b', br, 'mail_de_ella')
    expect(markupToRich(richToMarkup(tricky))).toEqual(tricky)
  })
})
