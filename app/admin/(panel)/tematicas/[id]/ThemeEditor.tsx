'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CircleAlert,
  Eye,
  Layers,
  LayoutList,
  Palette,
  Rocket,
  Save,
  Store,
  Tag,
  WandSparkles,
  History,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatARS, formatCompactARS } from '@/domain/admin/format'
import type { ThemeOrigin, ThemeStatus, ThemeVersionInfo } from '@/domain/admin/types'
import { ThemeListingSchema, type ThemeListing } from '@/domain/catalog'
import type { Plan } from '@/domain/plans'
import { parseThemeConfig } from '@/slides/config'
import type { ThemeConfigInput } from '@/slides/theme-config'
import { Button, ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { ease, spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../../_ui/Confirm'
import { Badge, NeedsDb } from '../../../_ui/primitives'
import { THEME_STATUS } from '../../../_ui/status'
import { useAdminAction } from '../../../_ui/use-action'
import {
  loadVersionConfig,
  publishTheme,
  saveThemeDraft,
  setThemeStatus,
  updateThemeMeta,
} from '../actions'
import { hydrate, issuesBySlide, type EditorConfig } from './editor-state'
import { ListingTab, type ThemeMeta } from './ListingTab'
import { ModulesTab } from './ModulesTab'
import { PhonePreview } from './PhonePreview'
import { PlansTab } from './PlansTab'
import { StyleTab } from './StyleTab'
import { VersionsTab } from './VersionsTab'

type Tab = 'modulos' | 'planes' | 'ficha' | 'estilo' | 'versiones'

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'modulos', label: 'Módulos', icon: LayoutList },
  { id: 'planes', label: 'Planes', icon: Layers },
  { id: 'ficha', label: 'Ficha de tienda', icon: Tag },
  { id: 'estilo', label: 'Estilo', icon: Palette },
  { id: 'versiones', label: 'Versiones', icon: History },
]

interface Props {
  theme: {
    id: string
    slug: string
    name: string
    category: string
    description: string
    status: ThemeStatus
    sortOrder: number
    priceCents: number | null
    origin: ThemeOrigin
    currentVersion: number | null
    currentVersionId: string | null
    versions: ThemeVersionInfo[]
    updatedAt: string
  }
  initialConfig: ThemeConfigInput
  initialListing: ThemeListing | null
  plans: Plan[]
  categories: string[]
  stats: { sales30: number; revenue30: number; salesAll: number; byPlan: Record<string, number> }
  demo: boolean
}

const EMPTY_LISTING: ThemeListing = {
  title: 'Boxie de',
  highlight: '',
  subtitle: '',
  cardDescription: '',
  cardColor: '#F44E63',
  cardTone: 'light',
  images: ['/themes/pareja.jpg'],
  features: [],
  guide: null,
}

export function ThemeEditor({
  theme,
  initialConfig,
  initialListing,
  plans,
  categories,
  stats,
  demo,
}: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const confirm = useConfirm()
  const { run, pending, fields } = useAdminAction()

  const initialTab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'modulos') as Tab
  const [tab, setTab] = useState<Tab>(initialTab)

  // Configuración (borrador) y ficha, con su última versión guardada para saber qué cambió.
  const [savedConfig, setSavedConfig] = useState(() => hydrate(initialConfig))
  const [config, setConfig] = useState<EditorConfig>(savedConfig)
  const initialMeta: ThemeMeta = {
    name: theme.name,
    slug: theme.slug,
    category: theme.category,
    description: theme.description,
    sortOrder: theme.sortOrder,
    priceCents: theme.priceCents,
  }
  const [savedMeta, setSavedMeta] = useState({
    meta: initialMeta,
    listing: initialListing ?? { ...EMPTY_LISTING, highlight: theme.name },
  })
  const [meta, setMeta] = useState(savedMeta.meta)
  const [listing, setListing] = useState(savedMeta.listing)

  const configDirty = JSON.stringify(config) !== JSON.stringify(savedConfig)
  const metaDirty = JSON.stringify({ meta, listing }) !== JSON.stringify(savedMeta)
  const dirty = configDirty || metaDirty

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [previewPlan, setPreviewPlan] = useState(
    () => plans.find((p) => p.highlighted)?.slug ?? plans.at(-1)?.slug ?? '',
  )

  const validation = useMemo(() => parseThemeConfig(config), [config])
  const issues = useMemo(
    () => issuesBySlide(validation.success ? [] : validation.issues),
    [validation],
  )
  const issueCount = validation.success ? 0 : validation.issues.length
  const listingIssues = useMemo(() => {
    const r = ThemeListingSchema.safeParse(listing)
    return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  }, [listing])

  // Salir con cambios sin guardar pide confirmación del navegador.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const save = useCallback(async () => {
    let ok = true
    if (metaDirty) {
      const r = await run(() => updateThemeMeta(theme.id, meta, listing), { quiet: configDirty })
      if (r.ok) setSavedMeta({ meta, listing })
      else ok = false
    }
    if (configDirty && ok) {
      const snapshot = config
      const r = await run(() => saveThemeDraft(theme.id, snapshot))
      if (r.ok) setSavedConfig(snapshot)
      else ok = false
    }
    return ok
  }, [metaDirty, configDirty, run, theme.id, meta, listing, config])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty && !pending) void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, pending, save])

  const publish = async () => {
    if (!validation.success) {
      setTab('modulos')
      const first = [...issues.bySlide.keys()][0]
      if (first) setSelectedKey(first)
      return
    }
    const next = (theme.currentVersion ?? 0) + 1
    const ok = await confirm({
      icon: '🚀',
      title: `¿Publicar la versión ${next}?`,
      description: `${config.slides.length} pantallas. Las compras nuevas usan esta versión; las Boxies ya vendidas no cambian.${theme.status === 'draft' ? ' La temática pasa a estar a la venta.' : ''}`,
      confirm: 'Publicar',
    })
    if (!ok) return
    if (metaDirty && !(await save())) return
    const snapshot = config
    const r = await run(() => publishTheme(theme.id, snapshot))
    if (r.ok) {
      setSavedConfig(snapshot)
      router.refresh()
    }
  }

  const restore = async (version: ThemeVersionInfo) => {
    const ok = await confirm({
      title: `¿Usar la versión ${version.version} como borrador?`,
      description: 'Reemplaza el borrador actual (no se publica hasta que lo publiques).',
      confirm: 'Usar como borrador',
    })
    if (!ok) return
    const r = await run(() => loadVersionConfig(version.id), { quiet: true })
    if (r.ok && r.data) {
      setConfig(hydrate(r.data.config as ThemeConfigInput))
      setTab('modulos')
    }
  }

  const discard = async () => {
    const ok = await confirm({
      title: '¿Descartar los cambios?',
      description: 'Vuelve a lo último que guardaste.',
      confirm: 'Descartar',
      danger: true,
    })
    if (!ok) return
    setConfig(savedConfig)
    setMeta(savedMeta.meta)
    setListing(savedMeta.listing)
  }

  const status = THEME_STATUS[theme.status]
  const emoji = listing.guide?.emoji ?? '🎁'
  const withPreview = tab === 'modulos' || tab === 'planes' || tab === 'estilo'

  return (
    <div className="pb-28">
      <Link
        href="/admin/tematicas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Temáticas
      </Link>

      <motion.header
        className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: ease.out }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <motion.span
            className="grid size-16 shrink-0 place-items-center rounded-3xl text-3xl shadow-[0_10px_30px_rgba(42,36,51,0.12)]"
            style={{ background: listing.cardColor }}
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={spring.bouncy}
            aria-hidden
          >
            {emoji}
          </motion.span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-3xl font-bold text-ink">{meta.name}</h1>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
              {theme.currentVersion && <Badge tone="dark">v{theme.currentVersion}</Badge>}
              {theme.origin === 'generator' && (
                <Badge tone="violet">
                  <WandSparkles className="size-3" aria-hidden /> Generada
                </Badge>
              )}
              {demo && <NeedsDb what="themes, theme_versions, publish_theme()" />}
            </div>
            <p className="mt-1 text-sm text-neutral-600">
              {meta.category} · {stats.sales30} ventas y {formatCompactARS(stats.revenue30)} en 30
              días · {stats.salesAll} en total
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {theme.status === 'published' && (
            <ButtonLink
              href={`/tematicas/${theme.slug}`}
              external
              target="_blank"
              variant="ghost"
              size="sm"
              className="h-10"
            >
              <Store className="size-4" aria-hidden /> Ver en la tienda
            </ButtonLink>
          )}
          {theme.currentVersion !== null && theme.status !== 'archived' && (
            <Button
              variant="secondary"
              size="sm"
              className="h-10"
              disabled={pending}
              onClick={() =>
                void run(() =>
                  setThemeStatus(theme.id, theme.status === 'published' ? 'draft' : 'published'),
                ).then(() => router.refresh())
              }
            >
              <Eye className="size-4" aria-hidden />
              {theme.status === 'published' ? 'Sacar de la venta' : 'Poner a la venta'}
            </Button>
          )}
          <Button
            variant="dark"
            size="sm"
            className="h-10"
            disabled={!dirty || pending}
            onClick={() => void save()}
          >
            {pending ? <Spinner /> : <Save className="size-4" aria-hidden />} Guardar
          </Button>
          <Button size="sm" className="h-10" disabled={pending} onClick={() => void publish()}>
            <Rocket className="size-4" aria-hidden /> Publicar
          </Button>
        </div>
      </motion.header>

      <nav
        className="mb-6 flex gap-1 overflow-x-auto border-b border-line"
        aria-label="Secciones de la temática"
      >
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          const badge =
            t.id === 'modulos' && issueCount > 0
              ? issueCount
              : t.id === 'ficha' && listingIssues.length > 0
                ? listingIssues.length
                : null
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex shrink-0 items-center gap-2 px-4 pt-2 pb-3 text-sm font-semibold transition-colors',
                active ? 'text-ink' : 'text-neutral-500 hover:text-ink',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t.label}
              {badge !== null && (
                <span className="grid min-w-5 place-items-center rounded-full bg-critical px-1 text-[10px] leading-5 text-white">
                  {badge}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="theme-tab"
                  className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand"
                  transition={spring.snappy}
                />
              )}
            </button>
          )
        })}
      </nav>

      <div
        className={cn(withPreview && 'grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]')}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="min-w-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: ease.out }}
          >
            {tab === 'modulos' && (
              <ModulesTab
                config={config}
                onChange={setConfig}
                plans={plans}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                issues={issues.bySlide}
              />
            )}
            {tab === 'planes' && (
              <PlansTab
                config={config}
                onChange={setConfig}
                plans={plans}
                salesByPlan={stats.byPlan}
              />
            )}
            {tab === 'ficha' && (
              <ListingTab
                meta={meta}
                onMeta={setMeta}
                listing={listing}
                onListing={setListing}
                categories={categories}
                slugLocked={theme.versions.length > 0}
                fields={fields}
              />
            )}
            {tab === 'estilo' && <StyleTab config={config} onChange={setConfig} />}
            {tab === 'versiones' && (
              <VersionsTab
                versions={theme.versions}
                currentVersionId={theme.currentVersionId}
                onRestore={(v) => void restore(v)}
                restoring={pending}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {withPreview && (
          <aside className="hidden xl:block" aria-label="Vista previa">
            <div className="sticky top-24">
              <PhonePreview
                config={config}
                plans={plans}
                planSlug={previewPlan}
                onPlanChange={setPreviewPlan}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
              />
            </div>
          </aside>
        )}
      </div>

      <AnimatePresence>
        {(dirty || issueCount > 0) && (
          <motion.div
            className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-3xl lg:left-[calc(var(--sidebar,0px)+12px)]"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={spring.gentle}
          >
            <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-ink px-4 py-3 text-white shadow-[0_20px_60px_rgba(42,36,51,0.35)] sm:px-5">
              <div className="min-w-0 flex-1 text-sm">
                {dirty ? (
                  <p className="font-semibold">Tenés cambios sin guardar</p>
                ) : (
                  <p className="font-semibold">Borrador guardado</p>
                )}
                {issueCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('modulos')
                      const first = [...issues.bySlide.keys()][0]
                      if (first) setSelectedKey(first)
                    }}
                    className="flex items-center gap-1 text-xs text-gold hover:underline"
                  >
                    <CircleAlert className="size-3.5" aria-hidden />
                    {issueCount} {issueCount === 1 ? 'cosa' : 'cosas'} para corregir antes de
                    publicar
                  </button>
                ) : (
                  <p className="text-xs text-white/60">Todo válido: se puede publicar</p>
                )}
              </div>
              {dirty && (
                <button
                  type="button"
                  onClick={() => void discard()}
                  className="rounded-full px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Descartar
                </button>
              )}
              {dirty && (
                <Button size="sm" variant="white" disabled={pending} onClick={() => void save()}>
                  {pending ? <Spinner /> : <Save className="size-4" aria-hidden />} Guardar
                </Button>
              )}
              <Button size="sm" disabled={pending} onClick={() => void publish()}>
                <Rocket className="size-4" aria-hidden /> Publicar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="sr-only" aria-live="polite">
        {dirty ? 'Hay cambios sin guardar' : ''}
      </p>
      {theme.priceCents !== null && (
        <p className="mt-6 text-xs text-neutral-500">
          Precio propio heredado: {formatARS(theme.priceCents)} (los planes lo reemplazan).
        </p>
      )}
    </div>
  )
}
