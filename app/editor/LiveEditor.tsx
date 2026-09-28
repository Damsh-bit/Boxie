'use client'

import { useState } from 'react'
import type { BuyerContent, ParsedThemeConfig } from '@/slides/config'
import { uploadWithProgress, type EditorBackend, type UploadResult } from '@/slides/editor/backend'
import { initialDraft } from '@/slides/editor/draft'
import { Editor } from '@/slides/editor/Editor'
import { isUntouched } from '@/slides/editor/import-sandbox'
import { lockBoxieAction, saveDraftAction, setGiftPasswordAction } from './actions'
import { ImportSandbox } from './ImportSandbox'

export interface LiveEditorProps {
  code: string
  config: ParsedThemeConfig
  theme: { name: string; slug: string }
  content: BuyerContent
  media: Record<string, string>
  hasPassword: boolean
  editableUntil: string
  lifetimeDays: number
  allowPassword: boolean
  locked: { giftUrl: string; expiresAt: string } | null
}

/** El editor real: guarda con las acciones del servidor y sube las fotos a Storage. */
export function LiveEditor(props: LiveEditorProps) {
  const [backend] = useState<EditorBackend>(() => ({
    save: (draft) => saveDraftAction(draft),
    setPassword: (password) => setGiftPasswordAction(password),
    lock: () => lockBoxieAction(),
    async uploadPhoto(image, onProgress) {
      const form = new FormData()
      form.append('file', image.blob, image.type === 'image/webp' ? 'foto.webp' : 'foto.jpg')
      form.append('width', String(image.width))
      form.append('height', String(image.height))
      try {
        const { status, json } = await uploadWithProgress<UploadResult>(
          '/editor/foto',
          form,
          onProgress,
        )
        if (json && typeof json === 'object' && 'ok' in json) return json
        return {
          ok: false,
          error: status === 413 ? 'La foto pesa demasiado.' : 'No pudimos subir la foto.',
        }
      } catch {
        return { ok: false, error: 'Sin conexión. Probá de nuevo.' }
      }
    },
  }))
  const [state, setState] = useState(() => ({
    draft: initialDraft(props.config, props.content),
    media: props.media,
    session: 0,
  }))
  // Recién comprada y sin tocar: se ofrece traer lo que armaron en el editor de prueba.
  const [fresh] = useState(() => !props.locked && isUntouched(props.content))

  return (
    <>
      {fresh && (
        <ImportSandbox
          code={props.code}
          slug={props.theme.slug}
          config={props.config}
          backend={backend}
          onImported={(result) =>
            setState((s) => ({
              draft: result.draft,
              media: { ...s.media, ...result.media },
              session: s.session + 1,
            }))
          }
        />
      )}
      <Editor
        key={state.session}
        mode="live"
        config={props.config}
        theme={props.theme}
        code={props.code}
        editableUntil={props.locked ? null : props.editableUntil}
        lifetimeDays={props.lifetimeDays}
        initialDraft={state.draft}
        initialMedia={state.media}
        initialHasPassword={props.hasPassword}
        allowPassword={props.allowPassword}
        initialLocked={props.locked ? { ...props.locked, emailedTo: null } : null}
        backend={backend}
      />
    </>
  )
}
