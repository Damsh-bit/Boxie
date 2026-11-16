import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { getOrRotateEditorUrl } from '@/server/customer/data'
import { requireCustomerSession } from '@/server/customer/session'

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await requireCustomerSession('/cuenta')
  const editorUrl = await getOrRotateEditorUrl(params.id, session.email)
  redirect(editorUrl as unknown as Route)
}
