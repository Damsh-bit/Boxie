'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, CloudOff, Eye, Gift, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { z } from 'zod'
import { formatBoxieCode } from '@/domain/boxie'
import { Button, Nudge } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Input, Label } from '@/ui/form'
import { Modal } from '@/ui/Modal'
import { ease, Spinner, spring, Swap, useCalm } from '@/ui/motion'
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
  const [previewIndex, setPreviewIndex] = useState(
    () => modules.find((m) => m.id === openId)?.previewIndex ?? 0,
  )
  const [overlay, setOverlay] = useState<{ index: number } | null>(null)
  const [review, setReview] = useState<{ until: string } | null>(null)
  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const { status, schedule, flush } = useAutosave(backend.save)

  // Lo último que se guardó en el estado: los cambios que llegan tarde (una
  // foto que termina de subir) se suman a esto y no pisan lo escrito mientras.
  const latest = useRef(draft)
  useLayoutEffect(() => {
    latest.current = draft
  })

  const progress = progressSummary(modules, draft, { hasPassword })
  const ready = progress.missing.length === 0

  const change = (update: (current: EditorDraft) => EditorDraft) => {
    const next = update(latest.current)
    latest.current = next
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

  function toggle(module: EditorModule) {
    const opening = openId !== module.id
    setOpenId(opening ? module.id : null)
    if (opening) setPreviewIndex(module.previewIndex)
  }

  function goTo(moduleId: string) {
    const target = modules.find((m) => m.id === moduleId)
    if (!target) return
    setReview(null)
    setOpenId(target.id)
    setPreviewIndex(target.previewIndex)
    setTimeout(
      () =>
        document
          .getElementById(`seccion-${target.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      350,
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

  const overlayPlayer = (
    <AnimatePresence>
      {overlay && (
        <Player
          key="vista-previa"
          config={config}
          data={playerData}
          preview
          animateIn
          initialSlide={overlay.index}
          onClose={() => setOverlay(null)}
        />
      )}
    </AnimatePresence>
  )

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {locked ? (
          <motion.div
            key="lista"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            className="min-h-dvh bg-[#f7f5f6]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
            transition={{ duration: 0.35 }}
          >
            <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur-xl">
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
                <GiftButton
                  ready={ready}
                  className="hidden sm:inline-flex"
                  onClick={openReview}
                  size="sm"
                />
              </div>
            </header>

            {isSandbox && (
              <div className="border-b border-amber-200 bg-amber-50">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm text-amber-900">
                  <p className="flex-1">
                    🧪 <strong>Modo prueba:</strong> lo que cargues queda solo en este navegador
                    <span className="hidden sm:inline">; nada se sube a ningún servidor</span>.
                  </p>
                  <motion.button
                    type="button"
                    className="inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline"
                    onClick={() => setConfirmReset(true)}
                    initial="rest"
                    animate="rest"
                    whileHover="hover"
                    whileTap={{ scale: 0.96 }}
                  >
                    <Nudge rotate={-180}>
                      <RotateCcw className="size-3.5" aria-hidden />
                    </Nudge>
                    Empezar de nuevo
                  </motion.button>
                </div>
              </div>
            )}

            <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-32 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16">
              <motion.main
                className="min-w-0 space-y-4"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
              >
                <motion.section
                  variants={cardIn}
                  className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.05)] sm:p-8"
                >
                  <p className="text-xs font-bold tracking-widest text-brand uppercase">
                    {isSandbox ? 'Probá cómo se personaliza' : 'Tu Boxie'}
                  </p>
                  <h1 className="mt-1 font-display text-3xl leading-tight font-bold text-ink">
                    Personalizá tu Boxie {theme.name}
                  </h1>
                  <p className="mt-2 leading-relaxed text-neutral-600">
                    Completá cada parte a tu ritmo: se guarda sola. Cuando esté como querés, la
                    bloqueás y te damos el link para regalarla.
                  </p>
                  <Progress
                    done={progress.done}
                    total={progress.total}
                    missing={progress.missing.length}
                    onMissing={() => {
                      const first = progress.missing[0]
                      if (first) goTo(first.moduleId)
                    }}
                  />
                  {editableUntil && (
                    <p className="mt-3 text-xs text-neutral-500">
                      Podés editarla hasta el {formatLongDate(editableUntil)}.
                    </p>
                  )}
                </motion.section>

                {progress.modules.map(({ module, state, missing }) => (
                  <motion.div key={module.id} variants={cardIn}>
                    <ModuleCard
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
                              onChange={(e) => {
                                const recipientName = e.target.value
                                change((d) => ({ ...d, recipientName }))
                              }}
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
                              onChange={(e) => {
                                const senderName = e.target.value
                                change((d) => ({ ...d, senderName }))
                              }}
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
                            change((d) => ({
                              ...d,
                              slides: { ...d.slides, [module.slideKey!]: next },
                            }))
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
                  </motion.div>
                ))}

                <motion.section
                  variants={cardIn}
                  className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8"
                >
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-brand/30 blur-3xl"
                    animate={{ opacity: ready ? 1 : 0.35, scale: ready ? 1.15 : 1 }}
                    transition={spring.gentle}
                  />
                  <h2 className="relative font-display text-2xl font-bold">¿Terminaste?</h2>
                  <p className="relative mt-2 text-white/70">
                    <Swap id={ready ? 'lista' : 'falta'} y={6}>
                      {ready
                        ? 'Está todo listo. Mirala una última vez en la vista previa y regalala.'
                        : 'Revisá lo que falta y, cuando esté completa, la bloqueás para regalarla.'}
                    </Swap>
                  </p>
                  <GiftButton
                    ready={ready}
                    size="lg"
                    className="relative mt-5"
                    onClick={openReview}
                  >
                    Revisar y regalar
                  </GiftButton>
                </motion.section>
              </motion.main>

              <aside className="hidden lg:block" aria-label="Vista previa">
                <motion.div
                  className="sticky top-24"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.gentle, delay: 0.25 }}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-sm font-semibold text-ink">Vista previa</p>
                    <p className="text-xs text-neutral-500">
                      Así la ve {draft.recipientName.trim() || 'quien la recibe'}
                    </p>
                  </div>
                  <div className="mx-auto aspect-[9/19] h-[min(700px,calc(100dvh-9rem))]">
                    <Player
                      config={config}
                      data={playerData}
                      variant="embedded"
                      preview
                      slide={previewIndex}
                      onSlideChange={setPreviewIndex}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs text-neutral-400">
                    Deslizá o usá las flechas para recorrerla
                  </p>
                </motion.div>
              </aside>
            </div>

            <motion.div
              className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/90 px-3 pt-3 backdrop-blur-xl lg:hidden"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ ...spring.gentle, delay: 0.3 }}
            >
              <div className="mx-auto flex max-w-lg gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setOverlay({ index: previewIndex })}
                >
                  <Eye className="size-4" aria-hidden /> Vista previa
                </Button>
                <GiftButton ready={ready} className="flex-1" onClick={openReview} />
              </div>
            </motion.div>

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

            {isSandbox && (
              <Modal
                open={confirmReset}
                onOpenChange={setConfirmReset}
                icon="🧹"
                title="¿Empezar de nuevo?"
                description="Se borra todo lo que cargaste en esta prueba (textos y fotos). No se puede deshacer."
              >
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" block onClick={() => setConfirmReset(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    block
                    onClick={() => {
                      setConfirmReset(false)
                      sandbox?.onReset()
                    }}
                  >
                    <RotateCcw className="size-4" aria-hidden /> Borrar y empezar
                  </Button>
                </div>
              </Modal>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {overlayPlayer}
    </>
  )
}

const cardIn = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: ease.out } },
}

/** "Regalar": cuando la Boxie está completa, late para invitar al último paso. */
function GiftButton({
  ready,
  size = 'md',
  className,
  onClick,
  children = 'Regalar',
}: {
  ready: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick(): void
  children?: string
}) {
  const calm = useCalm()
  return (
    <span className={cn('relative inline-flex', className)}>
      {ready && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-brand opacity-0 motion-reduce:hidden"
          animate={
            calm ? undefined : { opacity: [0.45, 0], transform: ['scale(1)', 'scale(1.35)'] }
          }
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <Button size={size} block onClick={onClick} className="relative">
        <Gift className={size === 'lg' ? 'size-5' : 'size-4'} aria-hidden /> {children}
      </Button>
    </span>
  )
}

function Progress({
  done,
  total,
  missing,
  onMissing,
}: {
  done: number
  total: number
  missing: number
  onMissing(): void
}) {
  const complete = missing === 0
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-ink">
          <span className="relative inline-block min-w-[1ch] tabular-nums">
            <Swap id={done} y={10}>
              {done}
            </Swap>
          </span>{' '}
          de {total} partes completas
        </span>
        {complete ? (
          <motion.span
            className="inline-flex items-center gap-1 font-semibold text-green-700"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.bouncy}
          >
            <Check className="size-4" aria-hidden /> ¡Lista para regalar!
          </motion.span>
        ) : (
          <motion.button
            type="button"
            onClick={onMissing}
            className="inline-flex items-center gap-1 text-amber-700 underline-offset-2 hover:underline"
            initial="rest"
            animate="rest"
            whileHover="hover"
          >
            Faltan {missing} {missing === 1 ? 'dato obligatorio' : 'datos obligatorios'}
            <Nudge x={3}>
              <ArrowRight className="size-3.5" aria-hidden />
            </Nudge>
          </motion.button>
        )}
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Partes completas"
      >
        <motion.div
          className={cn(
            'h-full rounded-full transition-colors duration-500',
            complete ? 'bg-green-500' : 'bg-[linear-gradient(90deg,#f44e63,#ff8a9b)]',
          )}
          initial={false}
          animate={{ width: `${(done / Math.max(total, 1)) * 100}%` }}
          transition={spring.gentle}
        />
      </div>
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
  const view = (() => {
    switch (status.state) {
      case 'saving':
        return (
          <span className={cn(base, 'text-neutral-500')} role="status">
            <Spinner /> Guardando…
          </span>
        )
      case 'dirty':
        return (
          <button type="button" onClick={onRetry} className={cn(base, 'text-neutral-500')}>
            <motion.span
              className="size-2 rounded-full bg-amber-400"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              aria-hidden
            />
            Sin guardar
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
            <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: ease.out }}
              />
            </svg>
            {status.savedAt ? 'Guardado' : 'Al día'}
          </span>
        )
    }
  })()
  return (
    <span className="relative flex justify-end">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status.state}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: ease.out }}
        >
          {view}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
