import { describe, expect, it } from 'vitest'
import { buildCsp } from '../../proxy'

/**
 * La CSP es la red de seguridad contra XSS. Estos tests fijan lo que no se
 * puede aflojar sin darse cuenta.
 */

const directive = (csp: string, name: string) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `)) ?? ''

describe('Content-Security-Policy', () => {
  const prod = buildCsp('NONCE123', { dev: false, https: true })

  it('los scripts solo corren con el nonce del pedido (sin unsafe-inline ni eval)', () => {
    const scripts = directive(prod, 'script-src')
    expect(scripts).toContain("'nonce-NONCE123'")
    expect(scripts).toContain("'strict-dynamic'")
    expect(scripts).not.toContain("'unsafe-inline'")
    expect(scripts).not.toContain("'unsafe-eval'")
  })

  it('sin plugins, sin <base> ajeno, sin formularios ni frames hacia otros sitios', () => {
    expect(directive(prod, 'object-src')).toBe("object-src 'none'")
    expect(directive(prod, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(prod, 'form-action')).toBe("form-action 'self'")
    expect(directive(prod, 'frame-ancestors')).toBe("frame-ancestors 'none'")
  })

  it('no deja mandar datos a cualquier dominio (connect-src acotado)', () => {
    const connect = directive(prod, 'connect-src')
    expect(connect).not.toMatch(/\shttps:(\s|$)/)
    expect(connect).not.toContain('*')
  })

  it('solo embebe YouTube', () => {
    expect(directive(prod, 'frame-src')).toBe(
      'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
    )
  })

  it('en producción fuerza https; en desarrollo permite eval y el websocket de recarga', () => {
    expect(prod).toContain('upgrade-insecure-requests')
    const dev = buildCsp('N', { dev: true, https: false })
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'")
    expect(directive(dev, 'connect-src')).toContain('ws:')
    expect(dev).not.toContain('upgrade-insecure-requests')
  })
})
