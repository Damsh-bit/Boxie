'use server'

import { z } from 'zod'
import { ExpenseInputSchema } from '@/domain/admin/inputs'
import { MONEY_ROLES, runAction } from '../../_lib/action'

const paths = ['/admin', '/admin/finanzas']

export async function saveExpense(input: unknown) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    const expense = await repo.saveExpense(ExpenseInputSchema.parse(input), actor)
    return { message: `Gasto "${expense.description}" guardado` }
  })
}

export async function deleteExpense(id: string) {
  return runAction({ roles: MONEY_ROLES, revalidate: paths }, async ({ repo, actor }) => {
    await repo.deleteExpense(z.string().min(1).parse(id), actor)
    return { message: 'Gasto borrado' }
  })
}
