import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CAPABILITIES,
  capabilityStatus,
  connections,
  type SchemaReport,
  type TableCheck,
} from '../../app/admin/_lib/capabilities'

const section = (name: string) => CAPABILITIES.find((c) => c.section === name)!

function report(overrides: Record<string, TableCheck> = {}): SchemaReport {
  const tables = new Map<string, TableCheck>()
  for (const c of CAPABILITIES) for (const n of c.needs) tables.set(n.table, { state: 'ok' })
  for (const [table, check] of Object.entries(overrides)) tables.set(table, check)
  return { reachable: true, tables }
}

const byId = (list: ReturnType<typeof connections>, id: string) => list.find((c) => c.id === id)!

afterEach(() => vi.unstubAllEnvs())

describe('capabilityStatus', () => {
  it('en demo dice qué migración trae cada sección, sin verificar', () => {
    expect(capabilityStatus(section('Marketing'), null)).toEqual({ status: 'demo', detail: null })
  })

  it('con todo en la base, la sección está lista', () => {
    for (const c of CAPABILITIES.filter((c) => !c.pending))
      expect(capabilityStatus(c, report()).status).toBe('ok')
  })

  it('nombra la tabla que falta y la migración que la trae', () => {
    const r = capabilityStatus(
      section('Marketing'),
      report({ marketing_campaigns: { state: 'no-table' } }),
    )
    expect(r.status).toBe('missing')
    expect(r.detail).toContain('marketing_campaigns')
    expect(r.detail).toContain('20260927120000_marketing.sql')
  })

  it('una columna faltante solo afecta a las secciones que la usan', () => {
    const base = report({ users: { state: 'no-columns', columns: ['invite_token_hash'] } })
    expect(capabilityStatus(section('Equipo'), base)).toMatchObject({
      status: 'missing',
      detail: expect.stringContaining('users.invite_token_hash'),
    })
    expect(capabilityStatus(section('Login del panel'), base).status).toBe('ok')
  })

  it('si la base no responde, queda sin verificar (no "falta")', () => {
    expect(
      capabilityStatus(section('Ventas'), { reachable: false, error: 'fetch failed' }),
    ).toEqual({ status: 'unknown', detail: 'fetch failed' })
  })

  it('lo que todavía no existe queda por hacer, con o sin base', () => {
    const photos = section('Fotos de las temáticas')
    expect(capabilityStatus(photos, null).status).toBe('pending')
    expect(capabilityStatus(photos, report()).status).toBe('pending')
  })
})

describe('connections', () => {
  const production = () => {
    vi.stubEnv('DEMO_MODE', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.boxiedigital.com.ar')
    vi.stubEnv('PAYMENTS_PROVIDER', 'mercadopago')
    vi.stubEnv('MP_ACCESS_TOKEN', 'APP_USR-x')
    vi.stubEnv('RESEND_API_KEY', '')
  }

  it('sin webhook de Mercado Pago, los pagos quedan para revisar', () => {
    production()
    const payments = byId(connections({ schema: report(), rate: null }), 'payments')
    expect(payments.state).toBe('warning')
    expect(payments.detail).toContain('webhook')
  })

  it('en producción, sin Resend no sale ningún mail: falta', () => {
    production()
    expect(byId(connections({ schema: report(), rate: null }), 'mail').state).toBe('missing')
  })

  it('la base avisa cuántas tablas tienen migraciones pendientes', () => {
    production()
    const db = byId(
      connections({
        schema: report({
          plans: { state: 'no-table' },
          users: { state: 'no-columns', columns: ['password_hash'] },
        }),
        rate: null,
      }),
      'db',
    )
    expect(db.state).toBe('warning')
    expect(db.detail).toContain('2 tablas')
  })

  it('sin https, Mercado Pago no devuelve al sitio', () => {
    production()
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    expect(byId(connections({ schema: report(), rate: null }), 'site').state).toBe('warning')
  })

  it('la cotización de respaldo se avisa', () => {
    production()
    const rate = { rate: 1500, currency: 'USD', updatedAt: '', source: 'fallback' } as const
    expect(byId(connections({ schema: report(), rate }), 'currency').state).toBe('warning')
  })

  it('el píxel de Meta está apagado hasta configurarlo', () => {
    production()
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '')
    expect(byId(connections({ schema: report(), rate: null }), 'meta').state).toBe('off')
  })
})
