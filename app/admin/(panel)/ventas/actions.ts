'use server'

import { z } from 'zod'
import { SUPPORT_ROLES, runAction } from '../../_lib/action'

export async function refundOrder(id: string) {
  return runAction(
    {
      roles: SUPPORT_ROLES,
      revalidate: ['/admin', '/admin/ventas', `/admin/ventas/${id}`, '/admin/boxies'],
    },
    async ({ repo, actor }) => {
      await repo.refundOrder(z.string().min(1).max(64).parse(id), actor)
      return { message: 'Orden reembolsada: el regalo ya no se puede abrir' }
    },
  )
}
