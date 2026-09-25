'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  Eye,
  ListPlus,
  Plus,
  Rocket,
  Shuffle,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react'
import type { Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import type { Plan } from '@/domain/plans'
import { parseThemeConfig } from '@/slides/config'
import {
  ARCHETYPES,
  GENERAL_ARCHETYPE,
  generateTheme,
  MAX_BATCH,
  parseThemeList,
  type GeneratedTheme,
  type Structure,
} from '@/slides/generator/generate'
import { Player } from '@/slides/player/Player'
import { configForPlan, planContents } from '@/slides/plans'
import { sampleGift } from '@/slides/sample'
import { Button, ButtonLink } from '@/ui/Button'
import { ConfettiBurst } from '@/ui/ConfettiBurst'
import { cn } from '@/ui/cn'
import { Textarea } from '@/ui/form'
import { Modal } from '@/ui/Modal'
import { Collapse, ease, spring, Spinner } from '@/ui/motion'
import { Segmented, Switch } from '../../_ui/fields'
import { Badge, Card } from '../../_ui/primitives'
import { useAdminAction } from '../../_ui/use-action'
import { createGeneratedThemes, type CreatedTheme } from './actions'

const SUGGESTIONS = [
  'Día del Padre',
  'Día del Maestro',
  'Navidad en familia',
  'Egresados 2026',
  'Mascotas',
  'San Valentín',
  'Día del Amigo',
  'Jubilación',
  'Baby shower',
  'Hinchas de fútbol',
  'Gamers',
  'Pronta mejoría',
  'Para mi abuela',
  'Día del Niño',
  'Viaje de egresados',
  'Aniversario de novios',
]

interface Item {
  uid: number
  name: string
  variant: number
}

const STEP = 0.14
const STAGGER = 0.28

export function Generator({ plans, existingSlugs }: { plans: Plan[]; existingSlugs: string[] }) {
  const [text, setText] = useState('')
  const [structure, setStructure] = useState<Structure>('completa')
  const [publish, setPublish] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [nextUid, setNextUid] = useState(1)
  const [run, setRun] = useState(0)
  const [created, setCreated] = useState<CreatedTheme[] | null>(null)
  const [preview, setPreview] = useState<GeneratedTheme | null>(null)
  const [library, setLibrary] = useState(false)
  const { run: runAction, pending } = useAdminAction()

  const names = useMemo(() => parseThemeList(text), [text])

  // Lo mismo que hará el servidor: cada ítem con su variante, sin repetir slugs.
  const results = useMemo(() => {
    const taken = new Set(existingSlugs)
    return items.map((item) => {
      const theme = generateTheme(item.name, {
        plans,
        existingSlugs: taken,
        variant: item.variant,
        structure,
      })
      taken.add(theme.slug)
      const parsed = parseThemeConfig(theme.config)
      const contents = parsed.success ? planContents(parsed.data, plans) : []
      return { item, theme, contents }
    })
  }, [items, plans, existingSlugs, structure])

  const generate = () => {
    if (names.length === 0) return
    setItems(names.map((name, i) => ({ uid: nextUid + i, name, variant: 0 })))
    setNextUid((n) => n + names.length)
    setRun((r) => r + 1)
    setCreated(null)
  }

  const addSuggestion = (name: string) =>
    setText((t) => (t.trim() ? `${t.replace(/\s+$/, '')}\n${name}` : name))

  const create = () =>
    runAction(
      () =>
        createGeneratedThemes(
          items.map((i) => ({ name: i.name, variant: i.variant, structure })),
          publish,
        ),
      {
        onSuccess: (data) => {
          setCreated(data ?? [])
          setItems([])
          setText('')
        },
      },
    )

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <label
              htmlFor="lista"
              className="mb-2 flex items-center justify-between text-sm font-semibold text-ink"
            >
              Lista de temáticas
              <span className="text-xs font-normal text-neutral-500">
                Una por línea · hasta {MAX_BATCH}
              </span>
            </label>
            <Textarea
              id="lista"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={'Día del Padre\nMascotas\nEgresados 2026\nNavidad en familia'}
              className="font-medium"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  generate()
                }
              }}
            />
            <p className="mt-3 mb-2 text-xs font-semibold text-neutral-500">Ideas rápidas</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => {
                const used = names.some((n) => n.toLowerCase() === s.toLowerCase())
                return (
                  <motion.button
                    key={s}
                    type="button"
                    disabled={used}
                    onClick={() => addSuggestion(s)}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      used
                        ? 'border-transparent bg-brand-soft text-brand'
                        : 'border-line bg-white text-neutral-600 hover:border-brand/40 hover:text-brand',
                    )}
                    whileTap={{ scale: 0.94 }}
                    transition={spring.snappy}
                  >
                    {used ? (
                      <Check className="size-3" aria-hidden />
                    ) : (
                      <Plus className="size-3" aria-hidden />
                    )}
                    {s}
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-canvas p-4">
            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                Estructura
              </p>
              <Segmented
                id="structure"
                size="sm"
                value={structure}
                onChange={(v) => setStructure(v as Structure)}
                options={[
                  { value: 'completa', label: 'Completa · 20' },
                  { value: 'compacta', label: 'Compacta · 12' },
                ]}
              />
              <p className="mt-2 text-xs text-neutral-500">
                {structure === 'completa'
                  ? 'Todas las pantallas, repartidas en los planes.'
                  : 'Lo esencial y los juegos más jugados: más corta.'}
              </p>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Publicar al crear</p>
                <p className="text-xs text-neutral-500">
                  Si no, quedan como borradores para revisar.
                </p>
              </div>
              <Switch checked={publish} onChange={setPublish} label="Publicar al crear" />
            </div>
            <div className="mt-auto">
              <Button block size="lg" onClick={generate} disabled={names.length === 0}>
                <WandSparkles className="size-5" aria-hidden />
                {names.length > 0 ? `Generar ${names.length}` : 'Generar'}
              </Button>
              <p className="mt-2 text-center text-[11px] text-neutral-500">
                Ctrl + Enter también genera
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLibrary((o) => !o)}
          aria-expanded={library}
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:text-ink"
        >
          <span className="flex items-center gap-2">
            <BookOpenCheck className="size-4 text-brand" aria-hidden />
            {ARCHETYPES.length} ocasiones que reconoce (y una general para todo lo demás)
          </span>
          <motion.span animate={{ rotate: library ? 180 : 0 }} transition={spring.snappy}>
            <ChevronDown className="size-4" aria-hidden />
          </motion.span>
        </button>
        <Collapse open={library}>
          <div className="grid gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...ARCHETYPES, GENERAL_ARCHETYPE].map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
                <span className="text-2xl" aria-hidden>
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{a.label}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {a.keywords.length
                      ? a.keywords
                          .slice(0, 6)
                          .map((k) => k.replace(/^=/, ''))
                          .join(', ')
                      : 'Cualquier otra cosa'}
                  </p>
                  <span className="mt-1.5 flex gap-1">
                    {a.palettes.map((p) => (
                      <span
                        key={p.name}
                        className="size-3.5 rounded-full ring-1 ring-black/5"
                        style={{ background: p.primary }}
                        title={p.name}
                      />
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Collapse>
      </Card>

      <AnimatePresence mode="wait">
        {created && (
          <motion.div
            key="created"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.soft}
          >
            <Card className="relative overflow-hidden text-center">
              <ConfettiBurst className="pointer-events-none absolute inset-0" count={60} />
              <motion.span
                className="mx-auto mb-3 grid size-16 place-items-center rounded-3xl bg-brand text-white shadow-[0_14px_36px_rgba(244,78,99,0.35)]"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={spring.bouncy}
              >
                <Rocket className="size-7" aria-hidden />
              </motion.span>
              <h2 className="font-display text-2xl font-bold text-ink">
                {created.length} {created.length === 1 ? 'temática lista' : 'temáticas listas'}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                {created.some((c) => c.published)
                  ? 'Ya están a la venta. Podés ajustarlas cuando quieras.'
                  : 'Quedaron como borradores: revisalas y publicalas desde el editor.'}
              </p>
              <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
                {created.map((c, i) => (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.soft, delay: 0.2 + i * 0.05 }}
                  >
                    <Link
                      href={`/admin/tematicas/${c.id}` as Route}
                      className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
                    >
                      {c.name}
                      {c.published && <Badge tone="good">A la venta</Badge>}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-6 flex justify-center gap-2">
                <ButtonLink href="/admin/tematicas" variant="secondary" size="sm">
                  Ver el catálogo
                </ButtonLink>
                <Button size="sm" variant="dark" onClick={() => setCreated(null)}>
                  <ListPlus className="size-4" aria-hidden /> Generar más
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {results.length > 0 && (
        <section aria-labelledby="generadas">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="generadas" className="text-lg font-semibold text-ink">
              {results.length} {results.length === 1 ? 'temática generada' : 'temáticas generadas'}
              <span className="ml-2 text-sm font-normal text-neutral-500">
                todavía no se guardaron
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setItems([])} disabled={pending}>
                Descartar
              </Button>
              <Button size="sm" onClick={() => void create()} disabled={pending}>
                {pending ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
                {publish
                  ? `Crear y publicar ${results.length}`
                  : `Crear ${results.length} borradores`}
              </Button>
            </div>
          </div>

          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {results.map(({ item, theme, contents }, i) => (
                <motion.li
                  key={`${run}-${item.uid}`}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  transition={{ ...spring.soft, delay: i * STAGGER }}
                >
                  <ResultCard
                    theme={theme}
                    plans={plans}
                    contents={contents}
                    delay={i * STAGGER + 0.25}
                    animateKey={`${run}-${item.uid}-${item.variant}`}
                    onPreview={() => setPreview(theme)}
                    onVariant={() =>
                      setItems((list) =>
                        list.map((x) =>
                          x.uid === item.uid ? { ...x, variant: x.variant + 1 } : x,
                        ),
                      )
                    }
                    onRemove={() => setItems((list) => list.filter((x) => x.uid !== item.uid))}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      <PreviewModal theme={preview} plans={plans} onClose={() => setPreview(null)} />
    </div>
  )
}

const CONFIDENCE = {
  alta: { tone: 'good', label: 'Ocasión reconocida' },
  media: { tone: 'info', label: 'Coincidencia parcial' },
  baja: { tone: 'warning', label: 'No la reconocí: revisala' },
} as const

function ResultCard({
  theme,
  plans,
  contents,
  delay,
  animateKey,
  onPreview,
  onVariant,
  onRemove,
}: {
  theme: GeneratedTheme
  plans: Plan[]
  contents: ReturnType<typeof planContents>
  delay: number
  animateKey: string
  onPreview(): void
  onVariant(): void
  onRemove(): void
}) {
  const confidence = CONFIDENCE[theme.archetype.confidence]
  const doneAt = delay + theme.steps.length * STEP + 0.1
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_1px_2px_rgba(42,36,51,0.04)]">
      <div className="relative h-36 overflow-hidden" style={{ background: theme.palette.card }}>
        <motion.div
          key={theme.listing.images[0]}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: ease.out, delay: delay + 5 * STEP }}
        >
          <Image
            src={theme.listing.images[0]!}
            alt=""
            fill
            sizes="(min-width: 1536px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </motion.div>
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${theme.palette.primary}cc, ${theme.palette.ink}55)`,
          }}
          aria-hidden
        />
        <motion.span
          key={`${animateKey}-emoji`}
          className="absolute top-4 left-4 grid size-14 place-items-center rounded-2xl bg-white text-3xl shadow-lg"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring.bouncy, delay: delay + STEP }}
          aria-hidden
        >
          {theme.archetype.emoji}
        </motion.span>
        <div className="absolute top-3 right-3 flex gap-1">
          <IconButton label="Vista previa" onClick={onPreview}>
            <Eye className="size-4" aria-hidden />
          </IconButton>
          <IconButton label="Otra variante (paleta y fotos)" onClick={onVariant}>
            <Shuffle className="size-4" aria-hidden />
          </IconButton>
          <IconButton label="Quitar de la lista" onClick={onRemove}>
            <X className="size-4" aria-hidden />
          </IconButton>
        </div>
        <div className="absolute right-4 bottom-3 left-4">
          <p className="truncate text-xl font-semibold text-white drop-shadow">{theme.name}</p>
          <p className="truncate text-xs text-white/85">/{theme.slug}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{theme.category}</Badge>
          <Badge tone={confidence.tone}>{confidence.label}</Badge>
          <span className="ml-auto flex items-center gap-1" title={theme.palette.name}>
            {[theme.palette.primary, theme.palette.accent, theme.palette.ink].map((c, i) => (
              <motion.span
                key={`${animateKey}-${c}-${i}`}
                className="size-4 rounded-full ring-2 ring-white"
                style={{ background: c }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring.bouncy, delay: delay + 2 * STEP + i * 0.05 }}
              />
            ))}
          </span>
        </div>

        <ol className="space-y-1.5">
          {theme.steps.map((step, i) => (
            <motion.li
              key={`${animateKey}-${step.label}`}
              className="flex items-start gap-2 text-sm"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: ease.out, delay: delay + i * STEP }}
            >
              <motion.span
                className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-good text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring.bouncy, delay: delay + i * STEP + 0.08 }}
              >
                <Check className="size-2.5 stroke-[4]" aria-hidden />
              </motion.span>
              <span className="min-w-0">
                <span className="font-semibold text-ink">{step.label}:</span>{' '}
                <span className="text-neutral-600">{step.detail}</span>
              </span>
            </motion.li>
          ))}
        </ol>

        <motion.div
          className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: doneAt }}
        >
          {plans.map((plan) => {
            const c = contents.find((x) => x.planSlug === plan.slug)
            return (
              <div key={plan.id}>
                <p className="text-sm font-semibold text-ink">{c?.screens ?? '—'}</p>
                <p className="truncate text-[11px] text-neutral-500">pantallas {plan.name}</p>
              </div>
            )
          })}
        </motion.div>
      </div>
    </article>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick(): void
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-brand"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
      aria-label={label}
      title={label}
    >
      {children}
    </motion.button>
  )
}

function PreviewModal({
  theme,
  plans,
  onClose,
}: {
  theme: GeneratedTheme | null
  plans: Plan[]
  onClose(): void
}) {
  const [planSlug, setPlanSlug] = useState(plans.at(-1)?.slug ?? '')
  const parsed = useMemo(() => (theme ? parseThemeConfig(theme.config) : null), [theme])
  const plan = plans.find((p) => p.slug === planSlug) ?? plans.at(-1)
  const config = useMemo(
    () => (parsed?.success ? (plan ? configForPlan(parsed.data, plan, plans) : parsed.data) : null),
    [parsed, plan, plans],
  )
  const data = useMemo(() => (config ? sampleGift(config) : null), [config])
  return (
    <Modal
      open={theme !== null}
      onOpenChange={(o) => !o && onClose()}
      title={theme?.name ?? ''}
      description="Vista previa con contenido de ejemplo"
      className="sm:max-w-md"
    >
      {plans.length > 1 && (
        <div className="mt-4 flex justify-center">
          <Segmented
            id="gen-preview-plan"
            size="sm"
            value={plan?.slug ?? ''}
            onChange={setPlanSlug}
            options={plans.map((p) => ({ value: p.slug, label: p.name }))}
          />
        </div>
      )}
      <div className="mx-auto mt-4 aspect-[9/19] h-[min(620px,70dvh)]">
        {config && data && (
          <Player
            key={`${theme?.slug}-${plan?.slug}`}
            config={config}
            data={data}
            variant="embedded"
            preview
          />
        )}
      </div>
    </Modal>
  )
}
