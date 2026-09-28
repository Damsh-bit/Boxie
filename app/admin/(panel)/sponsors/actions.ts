'use server'

import { z } from 'zod'
import { SponsorInputSchema } from '@/domain/sponsors'
import { AdminRepoError } from '@/server/admin/repo'
import { SponsorsError, sponsorsRepo, type SponsorsRepo } from '@/server/sponsors/repo'
import { MONEY_ROLES, runAction } from '../../_lib/action'

// Un sponsor activo se ve en el sitio: se revalidan las páginas donde puede aparecer.
const paths = ['/admin/sponsors', '/', '/galeria', '/precios', '/marcas']

/** Los errores de sponsors se muestran como los del panel (mensaje para la persona). */
async function withRepo<T>(fn: (repo: SponsorsRepo) => Promise<T>): Promise<T> {
  try {
    return await fn(await sponsorsRepo())
  } catch (error) {
    if (error instanceof SponsorsError) throw new AdminRepoError(error.message)
    throw error
  }
}

export async function saveSponsor(input: unknown) {
  return runAction<{ id: string }>({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    const sponsor = await withRepo((r) => r.save(SponsorInputSchema.parse(input), actor))
    return { message: `${sponsor.name} guardado`, data: { id: sponsor.id } }
  })
}

export async function deleteSponsor(id: string) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    await withRepo((r) => r.delete(z.string().min(1).max(64).parse(id), actor))
    return { message: 'Sponsor borrado' }
  })
}
