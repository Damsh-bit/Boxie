'use server'

import { z } from 'zod'
import { TaskInputSchema } from '@/domain/admin/inputs'
import { runAction } from '../../_lib/action'

const paths = ['/admin/tareas']

export async function saveTask(input: unknown) {
  return runAction({ revalidate: paths }, async ({ repo, actor }) => {
    const task = await repo.saveTask(TaskInputSchema.parse(input), actor)
    return { message: 'Tarea guardada', data: { id: task.id } }
  })
}

export async function moveTask(id: string, status: string, position: number) {
  return runAction({ revalidate: paths }, async ({ repo, actor }) => {
    await repo.moveTask(
      z.string().min(1).parse(id),
      z.enum(['todo', 'doing', 'done']).parse(status),
      z.number().int().min(0).max(10_000).parse(position),
      actor,
    )
  })
}

export async function deleteTask(id: string) {
  return runAction({ revalidate: paths }, async ({ repo, actor }) => {
    await repo.deleteTask(z.string().min(1).parse(id), actor)
    return { message: 'Tarea borrada' }
  })
}
