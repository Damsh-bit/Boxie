'use server'

import { z } from 'zod'
import { SUPPORT_ROLES, runAction } from '../../_lib/action'

const paths = (id: string) => ['/admin', '/admin/boxies', `/admin/boxies/${id}`, '/admin/ventas']
const Id = z.string().min(1).max(64)

export async function updateBoxieNames(id: string, recipientName: string, senderName: string) {
  return runAction({ roles: SUPPORT_ROLES, revalidate: paths(id) }, async ({ repo, actor }) => {
    const names = z
      .object({
        recipientName: z.string().trim().max(40, 'Hasta 40 caracteres'),
        senderName: z.string().trim().max(40, 'Hasta 40 caracteres'),
      })
      .parse({ recipientName, senderName })
    await repo.updateBoxieNames(Id.parse(id), names, actor)
    return { message: 'Nombres corregidos' }
  })
}

export async function extendBoxie(id: string, days: number) {
  return runAction({ roles: SUPPORT_ROLES, revalidate: paths(id) }, async ({ repo, actor }) => {
    const value = z.number().int().min(1).max(365).parse(days)
    await repo.extendBoxie(Id.parse(id), value, actor)
    return { message: `Se extendió ${value} días` }
  })
}

export async function unlockBoxie(id: string) {
  return runAction({ roles: SUPPORT_ROLES, revalidate: paths(id) }, async ({ repo, actor }) => {
    await repo.unlockBoxie(Id.parse(id), actor)
    return { message: 'Desbloqueada: el comprador ya puede corregirla' }
  })
}

export async function resendBoxieEmail(id: string, kind: 'access' | 'gift') {
  return runAction({ roles: SUPPORT_ROLES, revalidate: paths(id) }, async ({ repo, actor }) => {
    await repo.resendBoxieEmail(Id.parse(id), z.enum(['access', 'gift']).parse(kind), actor)
    return {
      message:
        repo.mode === 'demo'
          ? 'Registrado (en demo no sale ningún mail)'
          : kind === 'access'
            ? 'Le reenviamos el link del editor'
            : 'Le reenviamos el link del regalo',
    }
  })
}
