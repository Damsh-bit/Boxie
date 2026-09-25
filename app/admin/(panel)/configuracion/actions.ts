'use server'

import { SettingsInputSchema } from '@/domain/admin/inputs'
import { AdminRepoError } from '@/server/admin/repo'
import { MONEY_ROLES, runAction } from '../../_lib/action'

export async function saveSettings(input: unknown) {
  return runAction(
    { roles: MONEY_ROLES, revalidate: ['/admin', '/admin/configuracion', '/admin/finanzas', '/'] },
    async ({ repo, actor }) => {
      await repo.saveSettings(SettingsInputSchema.parse(input), actor)
      return { message: 'Configuración guardada' }
    },
  )
}

/** Solo en demo: vuelve a los datos de muestra (borra lo que se cambió). */
export async function resetDemo() {
  return runAction({ roles: ['owner'], revalidate: ['/admin', '/'] }, async ({ repo }) => {
    if (!repo.reset) throw new AdminRepoError('Solo existe en el modo demo.')
    await repo.reset()
    return { message: 'Datos de muestra restablecidos' }
  })
}
