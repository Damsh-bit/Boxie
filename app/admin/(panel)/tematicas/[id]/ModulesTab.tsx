'use client'

import { motion, Reorder, useDragControls } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleAlert,
  GripVertical,
  Lock,
  PenLine,
  Plus,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { z } from 'zod'
import type { Plan } from '@/domain/plans'
import { SchemaForm } from '@/slides/editor/SchemaForm'
import { issuesByPath } from '@/slides/editor/schema-info'
import { slideDefinitions, type SlideKind } from '@/slides/schemas'
import { FRAME_BACKGROUNDS, FrameSchema, PARTICLES } from '@/slides/theme-config'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Input, Label, Select } from '@/ui/form'
import { Modal } from '@/ui/Modal'
import { Collapse, spring } from '@/ui/motion'
import { useConfirm } from '../../../_ui/Confirm'
import { Switch } from '../../../_ui/fields'
import { Badge } from '../../../_ui/primitives'
import {
  CATEGORY,
  definitionOf,
  isStructural,
  isValidKey,
  kindCatalog,
  kindOf,
  newSlide,
  SlideIcon,
  type EditorConfig,
  type EditorSlide,
} from './editor-state'

const BACKGROUND_LABEL: Record<(typeof FRAME_BACKGROUNDS)[number], string> = {
  intro: 'Intro (logo en movimiento)',
  salmon: 'Coral',
  white: 'Blanco',
  dark: 'Oscuro',
  full: 'Pantalla completa',
  cream: 'Crema',
  party: 'Fiesta',
  none: 'Sin fondo',
}
const PARTICLE_LABEL: Record<(typeof PARTICLES)[number], string> = {
  none: 'Ninguna',
  heart: 'Corazones',
  friend: 'Emojis de amistad',
  'bday-fest': 'Fiesta de cumpleaños',
  circle: 'Burbujas',
}

export function ModulesTab({
  config,
  onChange,
  plans,
  selectedKey,
  onSelect,
  issues,
}: {
  config: EditorConfig
  onChange(config: EditorConfig): void
  plans: Plan[]
  selectedKey: string | null
  onSelect(key: string | null): void
  issues: Map<string, string[]>
}) {
  const [adding, setAdding] = useState(false)
  const slides = config.slides
  const setSlides = (next: EditorSlide[]) => onChange({ ...config, slides: next })
  const update = (key: string, patch: Partial<EditorSlide>) =>
    setSlides(slides.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const buyerModules = slides.filter((s) => definitionOf(s)?.buyerSchema).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          <span className="font-semibold text-ink">{slides.length} pantallas</span> · {buyerModules}{' '}
          las completa el comprador · arrastrá para reordenar
        </p>
        <Button size="sm" variant="dark" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden /> Agregar pantalla
        </Button>
      </div>

      <Reorder.Group axis="y" values={slides} onReorder={setSlides} className="space-y-2.5">
        {slides.map((slide, index) => (
          <SlideRow
            key={slide.key}
            slide={slide}
            index={index}
            total={slides.length}
            plans={plans}
            open={selectedKey === slide.key}
            onToggle={() => onSelect(selectedKey === slide.key ? null : slide.key)}
            onChange={(patch) => update(slide.key, patch)}
            onRename={(key) => {
              setSlides(slides.map((s) => (s.key === slide.key ? { ...s, key } : s)))
              onSelect(key)
            }}
            onMove={(to) => {
              const next = [...slides]
              const [moved] = next.splice(index, 1)
              next.splice(to, 0, moved!)
              setSlides(next)
            }}
            onRemove={() => {
              setSlides(slides.filter((s) => s.key !== slide.key))
              onSelect(null)
            }}
            keys={slides.map((s) => s.key)}
            issues={issues.get(slide.key) ?? []}
          />
        ))}
      </Reorder.Group>

      <AddSlideDialog
        open={adding}
        onOpenChange={setAdding}
        onPick={(kind) => {
          const created = newSlide(kind, slides, plans)
          // Se agrega antes del cierre (repaso y gracias quedan al final).
          const closing = slides.findIndex((s) => definitionOf(s)?.category === 'outro')
          const at = closing >= 0 ? closing : slides.length
          setSlides([...slides.slice(0, at), created, ...slides.slice(at)])
          onSelect(created.key)
          setAdding(false)
        }}
      />
    </div>
  )
}

function SlideRow({
  slide,
  index,
  total,
  plans,
  open,
  onToggle,
  onChange,
  onRename,
  onMove,
  onRemove,
  keys,
  issues,
}: {
  slide: EditorSlide
  index: number
  total: number
  plans: Plan[]
  open: boolean
  onToggle(): void
  onChange(patch: Partial<EditorSlide>): void
  onRename(key: string): void
  onMove(to: number): void
  onRemove(): void
  keys: string[]
  issues: string[]
}) {
  const controls = useDragControls()
  const confirm = useConfirm()
  const def = definitionOf(slide)
  const kind = kindOf(slide)
  const category = def ? CATEGORY[def.category] : null
  const structural = kind ? isStructural(kind) : false
  const planName = plans.find((p) => p.slug === slide.plan)?.name ?? plans[0]?.name ?? '—'
  const errors = useMemo(
    () => (def && open ? issuesByPath(def.themeSchema as z.ZodType, slide.props ?? {}) : {}),
    [def, open, slide.props],
  )

  return (
    <Reorder.Item
      value={slide}
      dragListener={false}
      dragControls={controls}
      className="relative"
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 50px rgba(42,36,51,0.18)', zIndex: 10 }}
      transition={spring.soft}
    >
      <motion.div
        layout="position"
        className={cn(
          'rounded-2xl border bg-white transition-colors',
          open ? 'border-brand/40 shadow-[0_10px_30px_rgba(244,78,99,0.1)]' : 'border-line',
        )}
      >
        <div className="flex items-center gap-2 p-2.5 pr-3">
          <button
            type="button"
            className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-neutral-400 hover:bg-canvas hover:text-ink active:cursor-grabbing"
            onPointerDown={(e) => controls.start(e)}
            aria-label={`Arrastrar ${def?.label ?? slide.kind}`}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span
              className={cn('grid size-10 shrink-0 place-items-center rounded-xl', category?.tone)}
            >
              <SlideIcon slide={slide} className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-400 tabular-nums">{index + 1}</span>
                <span className="truncate text-sm font-semibold text-ink">
                  {def?.label ?? `Tipo desconocido: ${slide.kind}`}
                </span>
              </span>
              <span className="block truncate text-xs text-neutral-500">
                <code className="font-mono">{slide.key}</code>
                {def?.buyerSchema && ' · la completa el comprador'}
              </span>
            </span>
          </button>
          {issues.length > 0 && (
            <Badge tone="critical">
              <CircleAlert className="size-3" aria-hidden /> {issues.length}
            </Badge>
          )}
          {def?.buyerSchema && (
            <span className="hidden sm:inline">
              <Badge tone="brand">
                <PenLine className="size-3" aria-hidden /> Módulo
              </Badge>
            </span>
          )}
          {structural ? (
            <span
              className="hidden items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-neutral-500 md:inline-flex"
              title="Va en todos los planes"
            >
              <Lock className="size-3" aria-hidden /> Todos los planes
            </span>
          ) : (
            <label className="hidden md:block">
              <span className="sr-only">Plan desde el que se incluye</span>
              <select
                value={slide.plan ?? plans[0]?.slug ?? ''}
                onChange={(e) => onChange({ plan: e.target.value })}
                className="h-8 cursor-pointer rounded-full border border-line bg-canvas px-3 text-xs font-semibold text-ink outline-none hover:border-neutral-300 focus:border-brand"
                title={`Se incluye desde el plan ${planName}`}
              >
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    Desde {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <motion.button
            type="button"
            onClick={onToggle}
            animate={{ rotate: open ? 180 : 0 }}
            transition={spring.snappy}
            className="grid size-8 place-items-center rounded-full text-neutral-400 hover:bg-canvas hover:text-ink"
            aria-label={open ? 'Cerrar' : 'Editar'}
          >
            <ChevronDown className="size-4" aria-hidden />
          </motion.button>
        </div>

        <Collapse open={open}>
          <div className="border-t border-line px-4 pt-4 pb-5 sm:px-5">
            {def && <p className="mb-4 text-sm text-neutral-600">{def.description}</p>}
            {issues.length > 0 && (
              <ul className="mb-4 space-y-1 rounded-xl bg-[#fdeaea] p-3 text-xs text-[#a52a2a]">
                {issues.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            )}
            {def && open && (
              <SchemaForm
                schema={def.themeSchema}
                value={slide.props ?? {}}
                onChange={(props) => onChange({ props })}
                idPrefix={`slide-${slide.key}`}
                errors={errors}
              />
            )}

            {kind && open && (
              <FrameEditor slide={slide} kind={kind} onChange={(frame) => onChange({ frame })} />
            )}

            <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl bg-canvas p-4 sm:grid-cols-2">
              <div className="md:hidden">
                <Label htmlFor={`plan-${slide.key}`}>Plan</Label>
                {structural ? (
                  <p className="text-sm text-neutral-600">Va en todos los planes.</p>
                ) : (
                  <Select
                    id={`plan-${slide.key}`}
                    value={slide.plan ?? plans[0]?.slug ?? ''}
                    onChange={(e) => onChange({ plan: e.target.value })}
                  >
                    {plans.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        Desde {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <KeyEditor current={slide.key} keys={keys} onRename={onRename} />
              <div className="flex items-end gap-2 sm:justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => onMove(index - 1)}
                  aria-label="Subir"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={index === total - 1}
                  onClick={() => onMove(index + 1)}
                  aria-label="Bajar"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-critical hover:bg-[#fdeaea] hover:text-critical"
                  disabled={total <= 1}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `¿Quitar "${def?.label ?? slide.key}"?`,
                      description: def?.buyerSchema
                        ? 'Es un módulo que completa el comprador: desaparece del editor en la próxima versión. Las Boxies ya vendidas no cambian.'
                        : 'Sale de la temática en la próxima versión. Las Boxies ya vendidas no cambian.',
                      confirm: 'Quitar',
                      danger: true,
                    })
                    if (ok) onRemove()
                  }}
                >
                  <Trash2 className="size-4" aria-hidden /> Quitar
                </Button>
              </div>
            </div>
          </div>
        </Collapse>
      </motion.div>
    </Reorder.Item>
  )
}

function KeyEditor({
  current,
  keys,
  onRename,
}: {
  current: string
  keys: string[]
  onRename(key: string): void
}) {
  const [value, setValue] = useState(current)
  const taken = value !== current && keys.includes(value)
  const invalid = !isValidKey(value)
  return (
    <div>
      <Label htmlFor={`key-${current}`}>Clave interna</Label>
      <Input
        id={`key-${current}`}
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        onBlur={() => {
          if (value !== current && !taken && !invalid) onRename(value)
          else setValue(current)
        }}
        className="py-2 font-mono text-sm"
        aria-invalid={taken || invalid || undefined}
      />
      <p className="mt-1 text-xs text-neutral-500">
        {taken
          ? 'Ya la usa otra pantalla.'
          : invalid
            ? 'Minúsculas, números, - y _.'
            : 'El contenido del comprador se guarda con esta clave.'}
      </p>
    </div>
  )
}

function FrameEditor({
  slide,
  kind,
  onChange,
}: {
  slide: EditorSlide
  kind: SlideKind
  onChange(frame: EditorSlide['frame']): void
}) {
  const frame = FrameSchema.parse({ ...slideDefinitions[kind].frame, ...slide.frame })
  const set = (patch: Partial<typeof frame>) => onChange({ ...slide.frame, ...patch })
  return (
    <fieldset className="mt-5 rounded-2xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">Marco de la pantalla</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`bg-${slide.key}`}>Fondo</Label>
          <Select
            id={`bg-${slide.key}`}
            value={frame.background}
            onChange={(e) => set({ background: e.target.value as typeof frame.background })}
          >
            {FRAME_BACKGROUNDS.map((b) => (
              <option key={b} value={b}>
                {BACKGROUND_LABEL[b]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`pt-${slide.key}`}>Partículas</Label>
          <Select
            id={`pt-${slide.key}`}
            value={frame.particles}
            onChange={(e) => set({ particles: e.target.value as typeof frame.particles })}
          >
            {PARTICLES.map((p) => (
              <option key={p} value={p}>
                {PARTICLE_LABEL[p]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">Pantalla completa</span>
          <Switch
            checked={frame.fullScreen}
            onChange={(v) => set({ fullScreen: v })}
            label="Pantalla completa"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">Confeti al llegar</span>
          <Switch checked={frame.confetti} onChange={(v) => set({ confetti: v })} label="Confeti" />
        </div>
      </div>
    </fieldset>
  )
}

function AddSlideDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange(open: boolean): void
  onPick(kind: SlideKind): void
}) {
  const catalog = useMemo(() => kindCatalog(), [])
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar pantalla"
      description="Cada tipo trae sus textos por defecto; después los cambiás."
      className="sm:max-w-2xl"
    >
      <div className="mt-6 space-y-5">
        {catalog.map(({ category, kinds }) => {
          const c = CATEGORY[category]
          const Icon = c.icon
          return (
            <section key={category}>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                <Icon className="size-3.5" aria-hidden /> {c.label}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {kinds.map((kind) => {
                  const def = slideDefinitions[kind]
                  return (
                    <motion.button
                      key={kind}
                      type="button"
                      onClick={() => onPick(kind)}
                      className="rounded-2xl border border-line p-3 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/40"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={spring.snappy}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        {def.label}
                        {def.buyerSchema && <Badge tone="brand">Módulo</Badge>}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {def.description}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
