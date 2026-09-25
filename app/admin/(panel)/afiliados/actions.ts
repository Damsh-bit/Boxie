'use server'

import { AffiliateInputSchema } from '@/domain/admin/inputs'
import { MONEY_ROLES, runAction } from '../../_lib/action'

export async function saveAffiliate(input: unknown) {
  return runAction(
    { roles: MONEY_ROLES, revalidate: ['/admin/afiliados', '/admin/cupones'] },
    async ({ repo, actor }) => {
      const affiliate = await repo.saveAffiliate(AffiliateInputSchema.parse(input), actor)
      return { message: `${affiliate.name} guardado` }
    },
  )
}
