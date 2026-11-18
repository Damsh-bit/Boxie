import { describe, expect, it } from 'vitest'
import { scrub, scrubString } from './sentry-scrub'

describe('limpieza de eventos para Sentry', () => {
  it('saca mails y tokens de los links', () => {
    expect(scrubString('Fallo al mandar a leandro@example.com')).toBe('Fallo al mandar a [mail]')
    expect(scrubString('GET https://ribbly.com.ar/g/AbCdEfGhIjKlMnOpQrStUvWxYz012345')).toBe(
      'GET https://ribbly.com.ar/g/[token]',
    )
    expect(scrubString('/editor/AbCdEfGhIjKlMnOpQrStUvWx')).toBe('/editor/[token]')
    expect(scrubString('MP API 401: Bearer APP_USR-123-abc')).toBe('MP API 401: Bearer [oculto]')
  })

  it('oculta cookies, firmas y claves por nombre de campo, en profundidad', () => {
    const out = scrub({
      headers: { cookie: 'bx_editor=abc', 'x-signature': 'ts=1,v1=x', 'user-agent': 'UA' },
      nested: [{ password: 'secreto', email: 'a@b.co' }],
    })
    expect(out).toEqual({
      headers: { cookie: '[oculto]', 'x-signature': '[oculto]', 'user-agent': 'UA' },
      nested: [{ password: '[oculto]', email: '[mail]' }],
    })
  })
})
