import type { Metadata, Route } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { listPublishedThemes } from '@/server/catalog'
import { getCustomerHeroContext } from '@/server/customer/data'
import { getCustomerSession } from '@/server/customer/session'
import { isDemoMode } from '@/server/demo'
import { loadEditor } from '@/server/editor'
import { EDITOR_COOKIE, readEditorSession } from '@/server/editor-session'
import { log } from '@/server/log'
import { SupportWidget } from '@/ui/support/SupportWidget'
import { EditorMessage, type EditorMessageKind } from './EditorMessage'
import { LiveEditor } from './LiveEditor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editor de tu Ribbly',
  robots: { index: false, follow: false },
}

const ERRORS: Record<string, EditorMessageKind> = {
  link: 'bad-link',
  limite: 'rate',
  servidor: 'server',
}

export default async function EditorPage({ searchParams }: PageProps<'/editor'>) {
  if (isDemoMode()) {
    const themes = await listPublishedThemes()
    return (
      <EditorMessage
        kind="demo"
        themes={themes.map((t) => ({ slug: t.slug, name: t.name, image: t.listing.images[0]! }))}
      />
    )
  }

  const { error } = await searchParams
  const cookieStore = await cookies()
  const session = readEditorSession(cookieStore.get(EDITOR_COOKIE)?.value)

  // 1. Si no hay sesión de edición activa:
  if (!session) {
    const customer = await getCustomerSession()
    if (customer) {
      // Si el cliente está logueado y tiene un borrador pendiente, lo llevamos a editarlo
      const heroCtx = await getCustomerHeroContext(customer.email)
      if (heroCtx.draft) {
        redirect(heroCtx.draft.editUrl as Route)
      }
      // Si no tiene borradores pendientes, lo llevamos a sus regalos
      redirect('/cuenta/boxies')
    }
    return <EditorMessage kind={(typeof error === 'string' && ERRORS[error]) || 'no-session'} />
  }

  // 2. Si hay sesión, cargar la Ribbly
  let data: Awaited<ReturnType<typeof loadEditor>>
  try {
    data = await loadEditor(session)
  } catch (e) {
    log.error('No se pudo cargar el editor', e, { boxieId: session.boxieId })
    return <EditorMessage kind="server" />
  }

  if (!data) {
    cookieStore.delete(EDITOR_COOKIE)
    return <EditorMessage kind="bad-link" />
  }

  // Si la Ribbly ya fue bloqueada para regalar: no se puede editar más
  if (data.availability === 'locked') {
    cookieStore.delete(EDITOR_COOKIE)
    const customer = await getCustomerSession()
    if (customer) {
      redirect('/cuenta/boxies')
    }
    redirect('/cuenta/login?next=/cuenta/boxies' as Route)
  }

  if (data.availability === 'expired') {
    cookieStore.delete(EDITOR_COOKIE)
    return <EditorMessage kind="expired" />
  }

  if (data.availability === 'refunded') {
    cookieStore.delete(EDITOR_COOKIE)
    return <EditorMessage kind="refunded" />
  }

  return (
    <>
      <LiveEditor
        code={data.code}
        config={data.config}
        theme={data.theme}
        content={data.content}
        media={data.media}
        hasPassword={data.hasPassword}
        editableUntil={data.expiresAt}
        lifetimeDays={data.lifetimeDays}
        allowPassword={data.allowPassword}
        locked={null}
      />
      {/* El botón de ayuda ya sabe de qué Boxie se trata. */}
      <SupportWidget hint={{ boxieCode: data.code, topic: 'boxie' }} nudge={false} />
    </>
  )
}
