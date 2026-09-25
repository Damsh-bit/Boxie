import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { listPublishedThemes } from '@/server/catalog'
import { isDemoMode } from '@/server/demo'
import { loadEditor } from '@/server/editor'
import { EDITOR_COOKIE, readEditorSession } from '@/server/editor-session'
import { log } from '@/server/log'
import { EditorMessage, type EditorMessageKind } from './EditorMessage'
import { LiveEditor } from './LiveEditor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editor de tu Boxie',
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
  const session = readEditorSession((await cookies()).get(EDITOR_COOKIE)?.value)
  if (!session) {
    return <EditorMessage kind={(typeof error === 'string' && ERRORS[error]) || 'no-session'} />
  }

  let data: Awaited<ReturnType<typeof loadEditor>>
  try {
    data = await loadEditor(session)
  } catch (e) {
    log.error('No se pudo cargar el editor', e, { boxieId: session.boxieId })
    return <EditorMessage kind="server" />
  }
  if (!data) return <EditorMessage kind="bad-link" />
  if (data.availability === 'expired') return <EditorMessage kind="expired" />
  if (data.availability === 'refunded') return <EditorMessage kind="refunded" />

  return (
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
      locked={data.giftUrl ? { giftUrl: data.giftUrl, expiresAt: data.expiresAt } : null}
    />
  )
}
