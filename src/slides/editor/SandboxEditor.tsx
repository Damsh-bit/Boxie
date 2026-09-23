'use client'

import { useState } from 'react'
import type { ParsedThemeConfig } from '../config'
import { initialDraft } from './draft'
import { Editor } from './Editor'
import { loadSandbox, resetSandbox, sandboxBackend } from './sandbox'

interface Props {
  config: ParsedThemeConfig
  theme: { name: string; slug: string }
  lifetimeDays: number
}

/**
 * El editor en modo prueba. Lee localStorage al montarse, así que se carga
 * solo en el navegador (sin render en el servidor).
 */
export function SandboxEditor(props: Props) {
  const [session, setSession] = useState(0)
  return (
    <SandboxSession
      key={session}
      {...props}
      onReset={() => {
        resetSandbox(props.theme.slug)
        setSession((s) => s + 1)
        window.scrollTo({ top: 0 })
      }}
    />
  )
}

function SandboxSession({ config, theme, lifetimeDays, onReset }: Props & { onReset(): void }) {
  const [stored] = useState(() => loadSandbox(theme.slug))
  const [backend] = useState(() => sandboxBackend(theme.slug, { lifetimeDays }))
  const [draft] = useState(() => initialDraft(config, stored.draft))
  return (
    <Editor
      mode="sandbox"
      config={config}
      theme={theme}
      code={null}
      editableUntil={null}
      lifetimeDays={lifetimeDays}
      initialDraft={draft}
      initialMedia={stored.media}
      initialHasPassword={stored.hasPassword}
      initialLocked={
        stored.locked
          ? { giftUrl: null, expiresAt: stored.locked.expiresAt, emailedTo: null }
          : null
      }
      backend={backend}
      sandbox={{ onReset, onUnlock: () => backend.unlock() }}
    />
  )
}
