import { describe, expect, it, vi } from 'vitest'
import type * as DbClient from '../db/client'

/**
 * Con la base real pero sin la migración de soporte (las tablas no existen),
 * el repositorio avisa "no disponible" en vez de fallar con un error crudo:
 * el widget lo muestra y la bandeja del panel explica qué falta.
 */

const failure = vi.hoisted(() => ({
  error: {
    code: 'PGRST205',
    message: "Could not find the table 'public.support_tickets' in the schema cache",
  } as { code: string; message: string } | null,
}))

vi.mock('../db/client', async () => {
  const actual = await vi.importActual<typeof DbClient>('../db/client')
  const builder: Record<string, unknown> = {}
  for (const op of ['select', 'eq', 'in', 'order', 'limit', 'insert', 'update', 'gte', 'ilike'])
    builder[op] = () => builder
  builder.maybeSingle = () => Promise.resolve({ data: null, error: failure.error })
  builder.single = builder.maybeSingle
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: failure.error })
  return {
    ...actual,
    serviceDb: () => ({
      from: () => builder,
      rpc: () => Promise.resolve({ data: null, error: failure.error }),
    }),
  }
})

const { supabaseSupportRepo } = await import('./supabase-repo')
const { SupportError } = await import('./repo')

describe('sin la migración de soporte', () => {
  it('listar, abrir y buscar avisan "no disponible"', async () => {
    for (const call of [
      () => supabaseSupportRepo.listTickets(),
      () => supabaseSupportRepo.getTicket('00000000-0000-4000-8000-000000000000'),
      () => supabaseSupportRepo.ticketsByTokenHashes(['a'.repeat(64)]),
    ]) {
      const error = await call().catch((e: unknown) => e)
      expect(error).toBeInstanceOf(SupportError)
      expect((error as InstanceType<typeof SupportError>).code).toBe('unavailable')
    }
  })

  it('también si falta la función support_post_message', async () => {
    failure.error = {
      code: 'PGRST202',
      message: 'Could not find the function public.support_post_message in the schema cache',
    }
    const error = await supabaseSupportRepo
      .postMessage({ ticketId: 'x', author: 'customer', authorName: 'Sofi', body: 'Hola' })
      .catch((e: unknown) => e)
    expect((error as InstanceType<typeof SupportError>).code).toBe('unavailable')
  })

  it('otros errores de la base siguen siendo errores', async () => {
    failure.error = { code: '57014', message: 'canceling statement due to statement timeout' }
    const error = await supabaseSupportRepo.listTickets().catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(SupportError)
    expect(String(error)).toContain('statement timeout')
  })
})
