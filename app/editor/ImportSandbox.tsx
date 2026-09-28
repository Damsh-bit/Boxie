'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { collectAssetIds, type ParsedThemeConfig } from '@/slides/config'
import type { EditorBackend } from '@/slides/editor/backend'
import type { EditorDraft } from '@/slides/editor/draft'
import { hasSandboxWork, importSandboxDraft } from '@/slides/editor/import-sandbox'
import { loadSandbox, resetSandbox, type SandboxState } from '@/slides/editor/sandbox'
import { Button } from '@/ui/Button'
import { spring, Spinner } from '@/ui/motion'

const cache = new Map<string, SandboxState | null>()
const noop = () => () => {}

/** Lo armado en la prueba de esta temática (se lee una vez, solo en el navegador). */
function useSandbox(slug: string): SandboxState | null {
  return useSyncExternalStore(
    noop,
    () => {
      if (!cache.has(slug)) {
        try {
          cache.set(slug, loadSandbox(slug))
        } catch {
          cache.set(slug, null)
        }
      }
      return cache.get(slug) ?? null
    },
    () => null,
  )
}

const dismissKey = (code: string) => `bx-import-no:${code}`

function isDismissed(code: string) {
  try {
    return localStorage.getItem(dismissKey(code)) === '1'
  } catch {
    return false
  }
}

/**
 * Arriba del editor recién comprado: "Tenés una Boxie a medio armar en la
 * prueba, ¿la traemos?". Sube las fotos, guarda y vuelve a abrir el editor
 * con todo cargado.
 */
export function ImportSandbox({
  code,
  slug,
  config,
  backend,
  onImported,
}: {
  code: string
  slug: string
  config: ParsedThemeConfig
  backend: EditorBackend
  onImported(result: { draft: EditorDraft; media: Record<string, string>; failed: number }): void
}) {
  const sandbox = useSandbox(slug)
  const [dismissed, setDismissed] = useState(() => isDismissed(code))
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const draft = sandbox?.draft ?? null
  const show = !dismissed && hasSandboxWork(draft)
  const photos = draft ? collectAssetIds(draft).length : 0

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(dismissKey(code), '1')
    } catch {
      // Sin almacenamiento: se cierra igual.
    }
  }

  const bring = async () => {
    if (!draft || !sandbox) return
    setError(null)
    setProgress({ done: 0, total: photos })
    const result = await importSandboxDraft({
      config,
      draft,
      media: sandbox.media,
      upload: (image) => backend.uploadPhoto(image, () => {}),
      onProgress: (done, total) => setProgress({ done, total }),
    })
    const saved = await backend.save(result.draft)
    setProgress(null)
    if (!saved.ok) {
      setError(saved.error)
      return
    }
    resetSandbox(slug)
    cache.delete(slug)
    dismiss()
    onImported(result)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={spring.gentle}
        >
          <div className="relative flex flex-col gap-3 rounded-3xl bg-ink p-5 text-white shadow-[0_18px_50px_rgba(42,36,51,0.25)] sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pr-8 sm:pr-0">
              <p className="font-semibold">Tenés una Boxie a medio armar en la prueba</p>
              <p className="text-sm text-white/70">
                {draft?.recipientName.trim()
                  ? `La de ${draft.recipientName.trim()}`
                  : 'Lo que escribiste'}
                {photos ? ` y ${photos} ${photos === 1 ? 'foto' : 'fotos'}` : ''}. ¿La traemos para
                no empezar de cero?
              </p>
              {progress && (
                <p className="mt-1 text-xs text-white/70" aria-live="polite">
                  {progress.total
                    ? `Subiendo fotos: ${progress.done} de ${progress.total}…`
                    : 'Guardando…'}
                </p>
              )}
              {error && (
                <p role="alert" className="mt-1 text-sm text-[#ffb4bf]">
                  {error}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => void bring()} disabled={progress !== null}>
                {progress && <Spinner />} Traer lo que armé
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={dismiss}
                disabled={progress !== null}
              >
                Empezar de cero
              </Button>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white sm:hidden"
              aria-label="Cerrar"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
