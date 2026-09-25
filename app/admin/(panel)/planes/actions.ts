'use server'

import { z } from 'zod'
import { PlanInputSchema } from '@/domain/admin/inputs'
import { AdminRepoError } from '@/server/admin/repo'
import { MONEY_ROLES, runAction } from '../../_lib/action'

const paths = ['/admin', '/admin/planes', '/admin/tematicas', '/', '/galeria']

export async function savePlan(input: unknown) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    const plan = await repo.savePlan(PlanInputSchema.parse(input), actor)
    return { message: `Plan ${plan.name} guardado` }
  })
}

export async function setPlanActive(id: string, active: boolean) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    const plans = await repo.listPlans()
    const plan = plans.find((p) => p.id === id)
    if (!plan) throw new AdminRepoError('El plan no existe.', 'not_found')
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = plan
    await repo.savePlan({ ...rest, id, active: z.boolean().parse(active) }, actor)
    return { message: active ? `${plan.name} vuelve a estar a la venta` : `${plan.name} pausado` }
  })
}

export async function deletePlan(id: string) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    await repo.deletePlan(z.string().min(1).parse(id), actor)
    return { message: 'Plan borrado' }
  })
}
