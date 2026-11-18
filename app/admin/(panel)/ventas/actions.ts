'use server'

import { z } from 'zod'
import { MONEY_ROLES, runAction } from '../../_lib/action'

export async function refundOrder(id: string) {
  return runAction(
    {
      // Da de baja el regalo: solo quien maneja la plata (auditoría 17/11, P2.5).
      roles: MONEY_ROLES,
      revalidate: ['/admin', '/admin/ventas', `/admin/ventas/${id}`, '/admin/ribblys'],
    },
    async ({ repo, actor }) => {
      await repo.refundOrder(z.string().min(1).max(64).parse(id), actor)
      return { message: 'Orden reembolsada: el regalo ya no se puede abrir' }
    },
  )
}
