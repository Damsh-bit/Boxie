'use server'

import { z } from 'zod'
import {
  CampaignInputSchema,
  ImportInputSchema,
  MarketingSettingsInputSchema,
  SpendBatchSchema,
} from '@/domain/marketing/inputs'
import { AdminRepoError } from '@/server/admin/repo'
import { MarketingError, marketingRepo, type MarketingRepo } from '@/server/marketing/repo'
import { MONEY_ROLES, runAction } from '../../_lib/action'

// La pauta también cambia Finanzas y el Resumen (se suma como gasto).
const paths = ['/admin/marketing', '/admin/finanzas', '/admin']

/** Los errores de marketing se muestran como los del panel (mensaje para la persona). */
async function withRepo<T>(fn: (repo: MarketingRepo) => Promise<T>): Promise<T> {
  try {
    return await fn(await marketingRepo())
  } catch (error) {
    if (error instanceof MarketingError) throw new AdminRepoError(error.message)
    throw error
  }
}

export async function saveCampaign(input: unknown) {
  return runAction<{ id: string }>({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    const campaign = await withRepo((r) => r.saveCampaign(CampaignInputSchema.parse(input), actor))
    return { message: `Campaña "${campaign.name}" guardada`, data: { id: campaign.id } }
  })
}

export async function setCampaignStatus(input: unknown, status: 'active' | 'paused') {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    const parsed = CampaignInputSchema.parse(input)
    await withRepo((r) => r.saveCampaign({ ...parsed, status }, actor))
    return { message: status === 'paused' ? 'Campaña pausada' : 'Campaña activada' }
  })
}

export async function deleteCampaign(id: string) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    await withRepo((r) => r.deleteCampaign(z.string().min(1).max(64).parse(id), actor))
    return { message: 'Campaña borrada (con sus resultados)' }
  })
}

export async function saveSpend(rows: unknown) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    const n = await withRepo((r) => r.saveSpend(SpendBatchSchema.parse(rows), actor))
    return { message: n === 1 ? 'Resultados del día guardados' : `${n} días guardados` }
  })
}

export async function deleteSpend(campaignId: string, day: string) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    await withRepo((r) =>
      r.deleteSpend(
        z.string().min(1).max(64).parse(campaignId),
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .parse(day),
        actor,
      ),
    )
    return { message: 'Día borrado' }
  })
}

export async function importSpend(input: unknown) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    const result = await withRepo((r) => r.importSpend(ImportInputSchema.parse(input), actor))
    return {
      message: `Importadas ${result.rows} filas${result.created ? ` · ${result.created} campañas nuevas` : ''}`,
    }
  })
}

export async function saveMarketingSettings(input: unknown) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ actor }) => {
    await withRepo((r) => r.saveSettings(MarketingSettingsInputSchema.parse(input), actor))
    return { message: 'Supuestos de marketing guardados' }
  })
}
