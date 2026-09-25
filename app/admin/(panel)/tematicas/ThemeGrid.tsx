'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  ArchiveRestore,
  Copy,
  ExternalLink,
  Layers,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import type { Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import { formatCompactARS, formatRelative } from '@/domain/admin/format'
import type { ThemeOrigin, ThemeStatus } from '@/domain/admin/types'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/form'
import { Modal } from '@/ui/Modal'
import { ease, spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../_ui/Confirm'
import { Segmented } from '../../_ui/fields'
import { Menu } from '../../_ui/Menu'
import { Badge, EmptyState } from '../../_ui/primitives'
import { THEME_STATUS } from '../../_ui/status'
import { useAdminAction } from '../../_ui/use-action'
import { createTheme, deleteTheme, duplicateTheme, setThemeStatus } from './actions'

export interface ThemeCard {
  id: string
  slug: string
  name: string
  category: string
  status: ThemeStatus
  origin: ThemeOrigin
  image: string | null
  cardColor: string
  emoji: string
  version: number | null
  slides: number
  hasUnpublishedChanges: boolean
  sales30: number
  revenue30: number
  salesAll: number
  updatedAt: string
}

type Filter = 'todas' | ThemeStatus

const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function ThemeGrid({
  themes,
  initialStatus,
}: {
  themes: ThemeCard[]
  initialStatus: string
}) {
  const [filter, setFilter] = useState<Filter>(
    ['draft', 'published', 'archived'].includes(initialStatus)
      ? (initialStatus as Filter)
      : 'todas',
  )
  const [query, setQuery] = useState('')
  const count = (s: ThemeStatus) => themes.filter((t) => t.status === s).length
  const visible = useMemo(() => {
    const q = strip(query.trim())
    return themes.filter(
      (t) =>
        (filter === 'todas' || t.status === filter) &&
        (!q || strip(`${t.name} ${t.category} ${t.slug}`).includes(q)),
    )
  }, [themes, filter, query])

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          id="theme-filter"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            { value: 'todas', label: 'Todas', count: themes.length },
            { value: 'published', label: 'A la venta', count: count('published') },
            { value: 'draft', label: 'Borradores', count: count('draft') },
            { value: 'archived', label: 'Archivadas', count: count('archived') },
          ]}
        />
        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar temática…"
            className="h-10 rounded-full bg-white py-2 pl-10"
            aria-label="Buscar temática"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No hay temáticas con ese filtro"
          text="Probá con otro estado, o generá temáticas nuevas desde una lista."
          action={
            <Link
              href="/admin/generador"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Ir al generador
            </Link>
          }
        />
      ) : (
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((theme, i) => (
              <motion.li
                key={theme.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                transition={{ ...spring.soft, delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card theme={theme} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </>
  )
}

function Card({ theme }: { theme: ThemeCard }) {
  const router = useRouter()
  const confirm = useConfirm()
  const { run, pending } = useAdminAction()
  const status = THEME_STATUS[theme.status]
  const href = `/admin/tematicas/${theme.id}` as Route

  const archive = async () => {
    if (
      await confirm({
        title: `¿Archivar "${theme.name}"?`,
        description:
          'Sale de la tienda. Las Boxies ya vendidas siguen funcionando igual (usan su versión).',
        confirm: 'Archivar',
        icon: '🗄️',
      })
    )
      void run(() => setThemeStatus(theme.id, 'archived'))
  }
  const remove = async () => {
    if (
      await confirm({
        title: `¿Borrar "${theme.name}"?`,
        description: 'Es un borrador sin versiones publicadas: se borra para siempre.',
        confirm: 'Borrar',
        danger: true,
        icon: '🗑️',
      })
    )
      void run(() => deleteTheme(theme.id))
  }

  return (
    <motion.article
      className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_1px_2px_rgba(42,36,51,0.04)]"
      whileHover={{ y: -4, boxShadow: '0 18px 44px rgba(42,36,51,0.12)' }}
      transition={spring.snappy}
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <Link
        href={href}
        className="relative block aspect-[16/10] overflow-hidden"
        style={{ background: theme.cardColor }}
      >
        {theme.image && (
          <Image
            src={theme.image}
            alt=""
            fill
            sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        <span
          className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent"
          aria-hidden
        />
        <span className="absolute top-3 left-3 flex gap-1.5">
          <Badge tone={status.tone} dot className="bg-white/95">
            {status.label}
          </Badge>
          {theme.origin === 'generator' && (
            <Badge tone="violet" className="bg-white/95">
              <WandSparkles className="size-3" aria-hidden /> Generada
            </Badge>
          )}
        </span>
        <motion.span
          className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-2xl bg-white/95 text-2xl shadow-lg"
          whileHover={{ rotate: -12, scale: 1.1 }}
          transition={spring.bouncy}
          aria-hidden
        >
          {theme.emoji}
        </motion.span>
        <span className="absolute bottom-3 left-4 text-lg font-semibold text-white drop-shadow">
          {theme.name}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-neutral-600">
              {theme.category} · {theme.slides} pantallas
              {theme.version ? ` · v${theme.version}` : ''}
            </p>
            <AnimatePresence initial={false}>
              {theme.hasUnpublishedChanges && theme.version !== null && (
                <motion.p
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#8a6300]"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Sparkles className="size-3" aria-hidden /> Cambios sin publicar
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <Menu
            items={[
              { label: 'Editar', icon: <Pencil />, onSelect: () => router.push(href) },
              {
                label: 'Ver en la tienda',
                icon: <Store />,
                disabled: theme.status !== 'published',
                onSelect: () => window.open(`/tematicas/${theme.slug}`, '_blank'),
              },
              {
                label: 'Ver la Boxie de ejemplo',
                icon: <ExternalLink />,
                disabled: theme.status !== 'published',
                onSelect: () => window.open(`/ejemplo/${theme.slug}`, '_blank'),
              },
              {
                label: 'Duplicar',
                icon: <Copy />,
                onSelect: () =>
                  void run(() => duplicateTheme(theme.id), {
                    onSuccess: (data) =>
                      data && router.push(`/admin/tematicas/${data.id}` as Route),
                  }),
              },
              'separator',
              theme.status === 'archived'
                ? {
                    label: 'Volver a borrador',
                    icon: <ArchiveRestore />,
                    onSelect: () => void run(() => setThemeStatus(theme.id, 'draft')),
                  }
                : { label: 'Archivar', icon: <Archive />, onSelect: () => void archive() },
              ...(theme.version === null && theme.salesAll === 0
                ? [
                    {
                      label: 'Borrar',
                      icon: <Trash2 />,
                      danger: true,
                      onSelect: () => void remove(),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <Metric icon={<ShoppingBag />} value={String(theme.sales30)} label="ventas 30 d" />
          <Metric
            icon={<Layers />}
            value={formatCompactARS(theme.revenue30)}
            label="facturado 30 d"
          />
          <Metric icon={<Pencil />} value={formatRelative(theme.updatedAt)} label="último cambio" />
        </div>
      </div>
    </motion.article>
  )
}

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-ink tabular-nums">{value}</p>
      <p className="flex items-center justify-center gap-1 truncate text-[11px] text-neutral-500 [&_svg]:size-3">
        {icon}
        {label}
      </p>
    </div>
  )
}

/** "Nueva temática": se escribe el nombre y el generador arma el borrador. */
export function NewThemeButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const { run, pending } = useAdminAction()
  const submit = () =>
    run(() => createTheme(name), {
      onSuccess: (data) => {
        setOpen(false)
        setName('')
        if (data) router.push(`/admin/tematicas/${data.id}` as Route)
      },
    })
  return (
    <>
      <Button size="sm" className="h-10" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Nueva temática
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        locked={pending}
        icon="✨"
        title="Nueva temática"
        description="Escribí la ocasión y armamos el borrador completo: textos, paleta, fotos y planes. Después lo ajustás."
      >
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej.: Día del Padre, Mascotas, Egresados 2026"
            maxLength={80}
            aria-label="Nombre de la temática"
          />
          <motion.div
            className="mt-4 flex justify-end"
            initial={false}
            animate={{ opacity: name.trim().length >= 2 ? 1 : 0.5 }}
            transition={{ duration: 0.2, ease: ease.out }}
          >
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              {pending ? <Spinner /> : <WandSparkles className="size-4" aria-hidden />}
              Crear borrador
            </Button>
          </motion.div>
        </form>
      </Modal>
    </>
  )
}
