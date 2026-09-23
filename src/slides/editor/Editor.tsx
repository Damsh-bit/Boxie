'use client'

import { Check, CloudOff, Eye, Gift, LoaderCircle, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { z } from 'zod'
import { formatBoxieCode } from '@/domain/boxie'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Input, Label } from '@/ui/form'
import { collectAssetIds, type ParsedThemeConfig } from '../config'
import { Player, type PlayerData } from '../player/Player'
import { slideDefinitions } from '../schemas'
import type { EditorBackend, LockResult } from './backend'
import type { EditorDraft } from './draft'
import { GiftReady } from './GiftReady'
import { ModuleCard } from './ModuleCard'
import { editorModules, progressSummary, type EditorModule } from './modules'
import { PasswordFields } from './PasswordFields'
import type { MediaAdapter } from './PhotoField'
import { ReviewDialog } from './ReviewDialog'
import { SchemaForm } from './SchemaForm'
import { issuesByPath } from './schema-info'
import { formatLongDate } from './share'
import { useAutosave, type AutosaveStatus } from './use-autosave'

export interface LockedState {
  giftUrl: string | null
  expiresAt: string
  emailedTo: string | null
}

export interface EditorProps {
  mode: 'live' | 'sandbox'
  config: ParsedThemeConfig
  theme: { name: string; slug: string }
  /** Código de soporte de la Boxie (editor real). */
  code: string | null
  /** Hasta cuándo se puede editar (editor real). */
  editableUntil: string | null
  /** Días que el regalo queda disponible desde que se bloquea. */
  lifetimeDays: number
  initialDraft: EditorDraft
  /** assetId → URL de las fotos ya cargadas. */
  initialMedia: Record<string, string>
  initialHasPassword: boolean
  /** Si ya está bloqueada, se muestra directamente el link. */
  initialLocked: LockedState | null
  backend: EditorBackend
  /** Solo en el modo prueba. */
  sandbox?: { onReset(): void; onUnlock(): void }
}

/**
 * El editor del comprador (Sprint 3): un módulo por cada parte que se
 * personaliza, con la vista previa del regalo real al lado. Guarda solo, y al
 * final se bloquea para regalar. Lo usan el editor real (/editor) y el de
 * prueba (/ejemplo/<temática>/personalizar), con distinto `backend`.
 */
export function Editor({
  mode,
  config,
  theme,
  code,
  editableUntil,
  lifetimeDays,
  initialDraft,
  initialMedia,
  initialHasPassword,
  initialLocked,
  backend,
  sandbox,
}: EditorProps) {
  const isSandbox = mode === 'sandbox'
  const modules = useMemo(() => editorModules(config), [config])
  const [draft, setDraft] = useState(initialDraft)
  const [media, setMedia] = useState(initialMedia)
  const [hasPassword, setHasPassword] = useState(initialHasPassword)
  const [locked, setLocked] = useState(initialLocked)
  const [openId, setOpenId] = useState<string | null>(() => {
    const summary = progressSummary(modules, initialDraft)
    return summary.modules.find((m) => m.state === 'incomplete')?.module.id ?? modules[0]!.id
  })
  const [preview, setPreview] = useState(() => ({
    index: modules.find((m) => m.id === openId)?.previewIndex ?? 0,
    nonce: 0,
  }))
  const [overlay, setOverlay] = useState<{ index: number } | null>(null)
  const [review, setReview] = useState<{ until: string } | null>(null)
  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const { status, schedule, flush } = useAutosave(backend.save)

  const progress = progressSummary(modules, draft, { hasPassword })

  const change = (next: EditorDraft) => {
    setDraft(next)
    schedule(next)
  }

  const mediaAdapter: MediaAdapter = {
    async upload(image, onProgress) {
      const result = await backend.uploadPhoto(image, onProgress)
      if (result.ok) setMedia((m) => ({ ...m, [result.photo.assetId]: result.url }))
      return result
    },
    resolve: (ref) => (ref ? media[ref.assetId] : undefined),
  }

  const playerData: PlayerData = {
    recipientName: draft.recipientName.trim() || 'Su nombre',
    senderName: draft.senderName.trim() || 'Tu nombre',
    content: draft.slides,
    media,
  }

  const showInPreview = (module: EditorModule) =>
    setPreview((p) => ({ index: module.previewIndex, nonce: p.nonce + 1 }))

  function toggle(module: EditorModule) {
    const opening = openId !== module.id
    setOpenId(opening ? module.id : null)
    if (opening) showInPreview(module)
  }

  function goTo(moduleId: string) {
    const target = modules.find((m) => m.id === moduleId)
    if (!target) return
    setReview(null)
    setOpenId(target.id)
    showInPreview(target)
    setTimeout(
      () =>
        document
          .getElementById(`seccion-${target.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    )
  }

  function openReview() {
    setLockError(null)
    setReview({ until: formatLongDate(new Date(Date.now() + lifetimeDays * 86_400_000)) })
    void flush()
  }

  async function confirmLock() {
    setLocking(true)
    setLockError(null)
    if (!(await flush())) {
      setLocking(false)
      setLockError('No pudimos guardar tus últimos cambios. Revisá tu conexión y probá de nuevo.')
      return
    }
    const result = await backend
      .lock()
      .catch((): LockResult => ({ ok: false, error: 'Sin conexión. Probá de nuevo en un rato.' }))
    setLocking(false)
    if (!result.ok) {
      setLockError(result.error)
      return
    }
    setReview(null)
    setLocked({ giftUrl: result.giftUrl, expiresAt: result.expiresAt, emailedTo: result.emailedTo })
    window.scrollTo({ top: 0 })
  }

  const overlayPlayer = overlay && (
    <Player
      config={config}
      data={playerData}
      preview
      initialSlide={overlay.index}
      onClose={() => setOverlay(null)}
    />
  )

  if (locked) {
    return (
      <>
        <GiftReady
          sandbox={isSandbox}
          recipientName={draft.recipientName}
          giftUrl={locked.giftUrl}
          expiresAt={locked.expiresAt}
          emailedTo={locked.emailedTo}
          hasPassword={hasPassword}
          theme={theme}
          onViewGift={() => setOverlay({ index: 0 })}
          onKeepEditing={() => {
            sandbox?.onUnlock()
            setLocked(null)
          }}
        />
        {overlayPlayer}
      </>
    )
  }

  return (
    <div className="min-h-dvh bg-[#f7f5f6]">
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="shrink-0" aria-label="Boxie Digital, inicio">
            <img src="/brand/boxie-logo.png" alt="Boxie" className="h-7 w-auto" />
          </Link>
          <div className="min-w-0 flex-1 border-l border-neutral-200 pl-3">
            <p className="truncate text-sm font-semibold text-ink">Boxie {theme.name}</p>
            <p className="truncate text-xs text-neutral-500">
              {isSandbox ? 'Modo prueba' : code ? `Código ${formatBoxieCode(code)}` : ''}
            </p>
          </div>
          <SaveIndicator status={status} sandbox={isSandbox} onRetry={() => void flush()} />
          <Button size="sm" className="hidden sm:inline-flex" onClick={openReview}>
            <Gift className="size-4" aria-hidden /> Regalar
          </Button>
        </div>
      </header>

      {isSandbox && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm text-amber-900">
            <p className="flex-1">
              🧪 <strong>Modo prueba:</strong> lo que cargues queda solo en este navegador
              <span className="hidden sm:inline">; nada se sube a ningún servidor</span>.
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline"
              onClick={() => {
                if (window.confirm('¿Borrar la prueba y empezar de nuevo?')) sandbox?.onReset()
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden /> Empezar de nuevo
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-32 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16">
        <main className="min-w-0 space-y-4">
          <section className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.05)] sm:p-8">
            <p className="text-xs font-bold tracking-widest text-brand uppercase">
              {isSandbox ? 'Probá cómo se personaliza' : 'Tu Boxie'}
            </p>
            <h1 className="mt-1 font-display text-3xl leading-tight font-bold text-ink">
              Personalizá tu Boxie {theme.name}
            </h1>
            <p className="mt-2 leading-relaxed text-neutral-600">
              Completá cada parte a tu ritmo: se guarda sola. Cuando esté como querés, la bloqueás y
              te damos el link para regalarla.
            </p>
            <div className="mt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-ink">
                  {progress.done} de {progress.total} partes completas
                </span>
                <span className={progress.missing.length ? 'text-amber-700' : 'text-green-700'}>
                  {progress.missing.length
                    ? `Faltan ${progress.missing.length} ${progress.missing.length === 1 ? 'dato obligatorio' : 'datos obligatorios'}`
                    : '¡Lista para regalar!'}
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
                aria-label="Partes completas"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-500"
                  style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
              {editableUntil && (
                <p className="mt-3 text-xs text-neutral-500">
                  Podés editarla hasta el {formatLongDate(editableUntil)}.
                </p>
              )}
            </div>
          </section>

          {progress.modules.map(({ module, state, missing }) => (
            <ModuleCard
              key={module.id}
              module={module}
              progress={{ state, missing }}
              open={openId === module.id}
              onToggle={() => toggle(module)}
              onPreview={() => setOverlay({ index: module.previewIndex })}
            >
              {module.kind === 'globals' && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="editor-para">
                      Para<span className="ml-1 text-brand">*</span>
                    </Label>
                    <Input
                      id="editor-para"
                      value={draft.recipientName}
                      maxLength={40}
                      autoComplete="off"
                      placeholder="Su nombre o apodo"
                      onChange={(e) => change({ ...draft, recipientName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editor-de">
                      De parte de<span className="ml-1 text-brand">*</span>
                    </Label>
                    <Input
                      id="editor-de"
                      value={draft.senderName}
                      maxLength={40}
                      autoComplete="off"
                      placeholder="Tu nombre"
                      onChange={(e) => change({ ...draft, senderName: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {module.kind === 'slide' && module.slideKind && module.slideKey && (
                <SlideFields
                  module={module}
                  value={draft.slides[module.slideKey]}
                  media={mediaAdapter}
                  onChange={(next) =>
                    change({ ...draft, slides: { ...draft.slides, [module.slideKey!]: next } })
                  }
                />
              )}

              {module.kind === 'password' && (
                <PasswordFields
                  hasPassword={hasPassword}
                  onSave={async (password) => {
                    const result = await backend.setPassword(password)
                    if (result.ok) setHasPassword(result.hasPassword)
                    return result
                  }}
                />
              )}
            </ModuleCard>
          ))}

          <section className="rounded-3xl bg-ink p-6 text-white sm:p-8">
            <h2 className="font-display text-2xl font-bold">¿Terminaste?</h2>
            <p className="mt-2 text-white/70">
              {progress.missing.length
                ? 'Revisá lo que falta y, cuando esté completa, la bloqueás para regalarla.'
                : 'Está todo listo. Mirala una última vez en la vista previa y regalala.'}
            </p>
            <Button size="lg" className="mt-5" onClick={openReview}>
              <Gift className="size-5" aria-hidden /> Revisar y regalar
            </Button>
          </section>
        </main>

        <aside className="hidden lg:block" aria-label="Vista previa">
          <div className="sticky top-24">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-ink">Vista previa</p>
              <p className="text-xs text-neutral-500">
                Así la ve {draft.recipientName.trim() || 'quien la recibe'}
              </p>
            </div>
            <div className="mx-auto aspect-[9/19] h-[min(700px,calc(100dvh-9rem))]">
              <Player
                key={preview.nonce}
                config={config}
                data={playerData}
                variant="embedded"
                preview
                initialSlide={preview.index}
              />
            </div>
            <p className="mt-3 text-center text-xs text-neutral-400">
              Deslizá o usá las flechas para recorrerla
            </p>
          </div>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-3 pt-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setOverlay({ index: preview.index })}
          >
            <Eye className="size-4" aria-hidden /> Vista previa
          </Button>
          <Button className="flex-1" onClick={openReview}>
            <Gift className="size-4" aria-hidden /> Regalar
          </Button>
        </div>
      </div>

      {overlayPlayer}

      <ReviewDialog
        open={review !== null}
        onOpenChange={(open) => !open && setReview(null)}
        recipientName={draft.recipientName.trim()}
        senderName={draft.senderName.trim()}
        hasPassword={hasPassword}
        photos={collectAssetIds(draft).length}
        missing={progress.missing.map((m) => ({
          moduleId: m.moduleId,
          module: m.module,
          label: m.label,
        }))}
        lifetimeDays={lifetimeDays}
        until={review?.until ?? ''}
        sandbox={isSandbox}
        busy={locking}
        error={lockError}
        onGoTo={goTo}
        onConfirm={() => void confirmLock()}
      />
    </div>
  )
}

function SlideFields({
  module,
  value,
  media,
  onChange,
}: {
  module: EditorModule
  value: Record<string, unknown> | undefined
  media: MediaAdapter
  onChange(next: Record<string, unknown>): void
}) {
  const schema = slideDefinitions[module.slideKind!].buyerSchema as z.ZodType | null
  if (!schema) return null
  return (
    <SchemaForm
      schema={schema}
      value={value ?? {}}
      onChange={onChange}
      idPrefix={`m-${module.id}`}
      media={media}
      errors={issuesByPath(schema, value ?? {})}
    />
  )
}

function SaveIndicator({
  status,
  sandbox,
  onRetry,
}: {
  status: AutosaveStatus
  sandbox: boolean
  onRetry(): void
}) {
  const base = 'inline-flex shrink-0 items-center gap-1.5 text-xs font-medium'
  switch (status.state) {
    case 'saving':
      return (
        <span className={cn(base, 'text-neutral-500')} role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden /> Guardando…
        </span>
      )
    case 'dirty':
      return (
        <button type="button" onClick={onRetry} className={cn(base, 'text-neutral-500')}>
          <span className="size-2 rounded-full bg-amber-400" aria-hidden /> Sin guardar
        </button>
      )
    case 'error':
      return (
        <button
          type="button"
          onClick={onRetry}
          className={cn(base, 'text-red-600')}
          title={status.error ?? undefined}
          role="alert"
        >
          <CloudOff className="size-4" aria-hidden /> No se guardó · Reintentar
        </button>
      )
    default:
      return (
        <span
          className={cn(base, 'text-green-700')}
          role="status"
          title={sandbox ? 'Se guarda en este navegador' : 'Se guarda en tu Boxie'}
        >
          <Check className="size-4" aria-hidden />
          {status.savedAt ? 'Guardado' : 'Al día'}
        </span>
      )
  }
}
