'use server'

import { z } from 'zod'
import { MemberInputSchema } from '@/domain/admin/inputs'
import { runAction } from '../../_lib/action'

const OWNER = ['owner'] as const
const paths = ['/admin/equipo', '/admin/tareas']

export async function inviteMember(input: unknown) {
  return runAction({ roles: OWNER, revalidate: paths }, async ({ repo, actor }) => {
    const member = await repo.inviteMember(MemberInputSchema.parse(input), actor)
    return {
      message:
        repo.mode === 'demo'
          ? `${member.email} sumado (en demo no sale la invitación)`
          : `Le mandamos la invitación a ${member.email}`,
    }
  })
}

export async function updateMemberRole(id: string, role: string) {
  return runAction({ roles: OWNER, revalidate: paths }, async ({ repo, actor }) => {
    await repo.updateMemberRole(
      z.string().min(1).parse(id),
      z.enum(['owner', 'admin', 'editor', 'support']).parse(role),
      actor,
    )
    return { message: 'Rol actualizado' }
  })
}

export async function removeMember(id: string) {
  return runAction({ roles: OWNER, revalidate: paths }, async ({ repo, actor }) => {
    await repo.removeMember(z.string().min(1).parse(id), actor)
    return { message: 'Se quitó del equipo' }
  })
}
