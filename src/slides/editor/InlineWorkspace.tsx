'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Palette,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { cn } from '@/ui/cn'
import { Input, Label } from '@/ui/form'
import { spring } from '@/ui/motion'
import { buyerAxes, buyerStyle, type ParsedThemeConfig } from '../config'
import { arrayElement, getFieldMeta, missingRequired, objectShape } from '../fields'
import { slideEditorInfo } from '../labels'
import { Player, type PlayerData } from '../player/Player'
import { slideDefinitions } from '../schemas'

import type { SlideDefinition, SlideVariant } from '../types'
import type { EditorDraft } from './draft'
import type { MediaAdapter } from './PhotoField'
import { SchemaForm } from './SchemaForm'
import { defaultFor, issuesByPath } from './schema-info'
import { ShuffleButton, StyleSection, withStyle, type OfferedAxis } from './StylePicker'

/**
 * El editor directo (temáticas con `editor: 'inline'`, como Cumpleaños): el
 * regalo en grande y, encima, un recuadro con un lápiz en cada cosa que se
 * puede cambiar. Al tocarla se abre un globo ahí mismo con el campo y el
 * cambio se ve en vivo en el diseño. Arriba se elige el diseño de la pantalla
 * (si tiene variantes) y abajo quedan las opciones que no se ven.
 *
 * Las slides marcan lo editable con `data-edit` (ver `editable` en
 * ribbly/ui.tsx y `edit` en las escenas); este componente lo mide y lo dibuja.
 */

type AnySchema = z.core.$ZodType

interface Hotspot {
  /** Los campos que se editan tocándolo ('' si es una pieza con solo estilos). */
  path: string
  /** Los ejes de estilo de la pieza (data-style), de los que ofrece la pantalla. */
  styles: string[]
  x: number
  y: number
  w: number
  h: number
}

interface OpenEditor {
  slideKey: string
  path: string
  styles: string[]
  /** El lápiz de la pantalla: colores, tipografía y lo que no tiene pieza a la vista. */
  screen?: boolean
  /** Rectángulo del elemento en la pantalla (coordenadas del viewport). */
  anchor: { left: number; top: number; width: number; height: number }
}

export interface InlineWorkspaceProps {
  config: ParsedThemeConfig
  draft: EditorDraft
  playerData: PlayerData
  media: MediaAdapter
  slideIndex: number
  onSlideChange(index: number): void
  change(update: (current: EditorDraft) => EditorDraft): void
  /** Lo que va al costado: nombres, progreso, clave y el botón de regalar. */
  side: ReactNode
}

export function InlineWorkspace({
  config,
  draft,
  playerData,
  media,
  slideIndex,
  onSlideChange,
  change,
  side,
}: InlineWorkspaceProps) {
  const stage = useRef<HTMLDivElement>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [open, setOpen] = useState<OpenEditor | null>(null)
  const count = config.slides.length
  const index = Math.max(0, Math.min(slideIndex, count - 1))
  const slide = config.slides[index]!
  const definition = slideDefinitions[slide.kind] as SlideDefinition
  const info = slideEditorInfo(slide)
  const content = draft.slides[slide.key] ?? {}
  const variants = definition.variants?.(slide.props as Record<string, unknown>) ?? []
  const missing = missingPaths(definition, content, draft)
  const axes = buyerAxes(config, slide)
  const style = buyerStyle(config, slide, content)
  // Para medir: qué ejes ofrece la pantalla (sin volver a arrancar el bucle).
  const axisKeys = useRef<Set<string>>(new Set())
  useLayoutEffect(() => {
    axisKeys.current = new Set(axes.map((a) => a.key))
  })

  // Mide lo editable de la slide en pantalla en cada cuadro (las entradas se
  // animan y las listas se scrollean): solo actualiza si algo se movió.
  useEffect(() => {
    let frame = 0
    let last = ''
    const tick = () => {
      const root = stage.current
      const phone = root?.querySelector('.bx-phone')
      if (root && phone) {
        const base = root.getBoundingClientRect()
        const clip = phone.getBoundingClientRect()
        const next: Hotspot[] = []
        for (const el of root.querySelectorAll(
          '.bx-slide.is-active [data-edit], .bx-slide.is-active [data-style]',
        )) {
          const path = el.getAttribute('data-edit') ?? ''
          const styles = (el.getAttribute('data-style') ?? '')
            .split(',')
            .filter((key) => axisKeys.current.has(key))
          if (!path && !styles.length) continue
          const r = el.getBoundingClientRect()
          const left = Math.max(r.left, clip.left + 4)
          const top = Math.max(r.top, clip.top + 4)
          const right = Math.min(r.right, clip.right - 4)
          const bottom = Math.min(r.bottom, clip.bottom - 4)
          if (right - left < 14 || bottom - top < 12) continue
          next.push({
            path,
            styles,
            x: Math.round(left - base.left),
            y: Math.round(top - base.top),
            w: Math.round(right - left),
            h: Math.round(bottom - top),
          })
        }
        // Los chicos arriba de los grandes (un título sobre el video).
        next.sort((a, b) => b.w * b.h - a.w * a.h)
        const key = JSON.stringify(next)
        if (key !== last) {
          last = key
          setHotspots(next)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Arranca de cero en cada pantalla (lo medido antes es de otra).
  }, [index])

  const openAt = useCallback(
    (el: Element, target: { path?: string; styles?: string[]; screen?: boolean }) => {
      const r = el.getBoundingClientRect()
      setOpen({
        slideKey: slide.key,
        path: target.path ?? '',
        styles: target.styles ?? [],
        ...(target.screen ? { screen: true } : {}),
        anchor: { left: r.left, top: r.top, width: r.width, height: r.height },
      })
    },
    [slide.key],
  )

  // Al cambiar de slide se cierra el globo.
  const [shownIndex, setShownIndex] = useState(index)
  if (shownIndex !== index) {
    setShownIndex(index)
    setOpen(null)
    setHotspots([])
  }

  const go = (to: number) => onSlideChange(Math.max(0, Math.min(count - 1, to)))

  // Lo que esta pantalla tiene para editar y no se ve tocando (va en "Más opciones").
  const shape = definition.buyerSchema ? objectShape(definition.buyerSchema) : null
  const visible = new Set(hotspots.flatMap((h) => h.path.split(',').map((p) => p.split('.')[0]!)))
  const hidden = shape
    ? Object.keys(shape).filter((key) => {
        const meta = getFieldMeta(shape[key]!)
        return meta && meta.widget !== 'variant' && !visible.has(key)
      })
    : []

  const setVariant = (value: string) =>
    change((d) => {
      const current = d.slides[slide.key] ?? {}
      let next: Record<string, unknown> = { ...current, variant: value }
      // Notas sin tocar: pasan a las sugeridas del diseño nuevo.
      if (slide.kind === 'story.wishes') {
        const props = slide.props as { suggestions?: string[]; nightSuggestions?: string[] }
        const lists = [props.suggestions ?? [], props.nightSuggestions ?? []]
        const wishes = ((current.wishes as string[] | undefined) ?? []).filter((w) => w.trim())
        const untouched = !wishes.length || lists.some((l) => l.join('\n') === wishes.join('\n'))
        if (untouched) next = { ...next, wishes: value === 'noche' ? lists[1] : lists[0] }
      }
      return { ...d, slides: { ...d.slides, [slide.key]: next } }
    })

  const setStyle = (axis: string, value: string) =>
    change((d) => withStyle(d, [slide.key], axis, value))

  // "Usar en todo el regalo": cada pantalla que ofrece ese eje y esa opción.
  const applyEverywhere = (axis: string, value: string) =>
    change((d) => {
      const keys = config.slides
        .filter((s) =>
          buyerAxes(config, s).some(
            (a) => a.key === axis && a.options.some((o) => o.value === value),
          ),
        )
        .map((s) => s.key)
      return withStyle(d, keys, axis, value)
    })

  // Los ejes del lápiz de la pantalla: los de toda la pantalla y los de
  // piezas que no se ven ahora (la carta, con el sobre cerrado).
  const anchored = new Set(hotspots.flatMap((h) => h.styles))
  const screenAxes = axes.filter((a) => !anchored.has(a.key))

  // "Sorprendeme": una combinación al azar entre las que ofrece el globo.
  const shuffle = (list: OfferedAxis[]) =>
    change((d) =>
      list.reduce((acc, axis) => {
        const others = axis.options.filter((o) => o.value !== style[axis.key])
        const pick = others[Math.floor(Math.random() * others.length)] ?? axis.options[0]!
        return withStyle(acc, [slide.key], axis.key, pick.value)
      }, d),
    )

  const openAxes = open
    ? open.screen
      ? screenAxes
      : open.styles.flatMap((key) => axes.find((a) => a.key === key) ?? [])
    : []
  const openKey = open ? `${open.screen ? '@pantalla' : open.path}|${open.styles.join(',')}` : ''

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-5 pb-32 lg:grid-cols-[300px_minmax(0,1fr)] lg:pb-16">
      <div className="order-2 space-y-4 lg:order-1">{side}</div>

      <section className="order-1 min-w-0 lg:order-2" aria-label="Tu Ribbly, para editar">
        <div className="mx-auto flex max-w-[480px] flex-col items-center">
          <div className="mb-3 w-full text-center">
            <p className="text-xs font-bold tracking-widest text-brand uppercase">
              Pantalla {index + 1} de {count}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-ink">{info.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {definition.buyerSchema || axes.length
                ? 'Tocá lo que tenga el lápiz para cambiarlo.'
                : 'Esta pantalla no tiene nada para completar: es parte de la sorpresa.'}
            </p>
          </div>

          {variants.length > 1 && (
            <VariantPicker
              variants={variants}
              value={(content.variant as string) || variants[0]!.value}
              onChange={setVariant}
            />
          )}

          <div
            ref={stage}
            // isolate: los lápices quedan debajo del encabezado fijo del sitio al hacer scroll.
            className="relative isolate aspect-[9/17.5] w-full max-w-[420px] lg:h-[min(780px,calc(100dvh-13rem))] lg:w-auto"
          >
            <Player
              config={config}
              data={playerData}
              variant="embedded"
              preview
              editing
              slide={index}
              onSlideChange={onSlideChange}
            />
            <div className="pointer-events-none absolute inset-0 z-[60]">
              {hotspots.map((h, i) => (
                <HotspotBox
                  key={`${h.path}|${h.styles.join(',')}-${i}`}
                  hotspot={h}
                  label={hotspotLabel(definition, h.path, h.styles, axes)}
                  missing={!!h.path && isMissing(missing, h.path)}
                  selected={!open?.screen && openKey === `${h.path}|${h.styles.join(',')}`}
                  onOpen={(el) => openAt(el, { path: h.path, styles: h.styles })}
                />
              ))}
              {screenAxes.length > 0 && (
                <ScreenStyleButton
                  selected={!!open?.screen}
                  onOpen={(el) => openAt(el, { screen: true })}
                />
              )}
            </div>
          </div>

          <div className="mt-4 flex w-full items-center justify-between gap-2">
            <NavButton
              label="Pantalla anterior"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </NavButton>
            <label className="flex min-w-0 flex-1 justify-center">
              <span className="sr-only">Ir a la pantalla</span>
              <select
                className="max-w-full truncate rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm"
                value={index}
                onChange={(e) => go(Number(e.target.value))}
              >
                {config.slides.map((s, i) => (
                  <option key={s.key} value={i}>
                    {i + 1}. {slideEditorInfo(s).title}
                  </option>
                ))}
              </select>
            </label>
            <NavButton
              label="Pantalla siguiente"
              disabled={index === count - 1}
              onClick={() => go(index + 1)}
            >
              <ChevronRight className="size-5" aria-hidden />
            </NavButton>
          </div>

          {hidden.length > 0 && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
              onClick={(e) => openAt(e.currentTarget, { path: hidden.join(',') })}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Más opciones de esta pantalla
              {hidden.some((key) => isMissing(missing, key)) && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  Falta
                </span>
              )}
            </button>
          )}
        </div>
      </section>

      <AnimatePresence>
        {open && open.slideKey === slide.key && (
          <EditBubble
            key={openKey}
            anchor={open.anchor}
            title={
              open.screen
                ? 'Estilo de la pantalla'
                : hotspotLabel(definition, open.path, open.styles, axes)
            }
            onClose={() => setOpen(null)}
          >
            {open.path && (
              <FieldEditor
                definition={definition}
                slideKey={slide.key}
                path={open.path}
                draft={draft}
                media={media}
                change={change}
                onDone={() => setOpen(null)}
                showDone={false}
              />
            )}
            {openAxes.map((axis, i) => (
              <StyleSection
                key={axis.key}
                axis={axis}
                first={!open.path && i === 0}
                value={style[axis.key] ?? ''}
                onChange={(value) => setStyle(axis.key, value)}
                onApplyAll={
                  axis.global ? () => applyEverywhere(axis.key, style[axis.key] ?? '') : undefined
                }
              />
            ))}
            {openAxes.length > 1 && <ShuffleButton onClick={() => shuffle(openAxes)} />}
            <DoneButton onClick={() => setOpen(null)} />
          </EditBubble>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function HotspotBox({
  hotspot,
  label,
  missing,
  selected,
  onOpen,
}: {
  hotspot: Hotspot
  label: string
  missing: boolean
  selected: boolean
  onOpen(el: Element): void
}) {
  return (
    <motion.button
      type="button"
      className={cn(
        'group pointer-events-auto absolute rounded-xl outline-2 outline-offset-2 transition-colors',
        selected
          ? 'bg-white/10 outline-brand outline-solid'
          : missing
            ? 'outline-amber-400 outline-dashed hover:bg-white/15'
            : 'outline-white/90 outline-dashed hover:bg-white/15',
      )}
      style={{
        left: hotspot.x,
        top: hotspot.y,
        width: hotspot.w,
        height: hotspot.h,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.18)',
      }}
      aria-label={`Editar: ${label}`}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(e.currentTarget)
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <span
        className={cn(
          'absolute -top-3 -right-3 grid size-7 place-items-center rounded-full text-white shadow-md ring-2 ring-white transition-transform group-hover:scale-110',
          missing ? 'bg-amber-500' : 'bg-brand',
        )}
        aria-hidden
      >
        <Pencil className="size-3.5" />
      </span>
      {missing && (
        <span className="absolute -top-3 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
          Falta
        </span>
      )}
    </motion.button>
  )
}

/** El "Listo" del globo. */
function DoneButton({ onClick }: { onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/90"
    >
      <Check className="size-4" aria-hidden /> Listo
    </button>
  )
}

/**
 * El lápiz de la pantalla, como una insignia en la esquina de arriba a la
 * izquierda del teléfono (no tapa nada de la pantalla; abajo están sus botones
 * y, en el celular, el botón de ayuda del sitio): colores, tipografía,
 * decoración y las piezas que ahora no se ven.
 */
function ScreenStyleButton({ selected, onOpen }: { selected: boolean; onOpen(el: Element): void }) {
  return (
    <motion.button
      type="button"
      className={cn(
        'group pointer-events-auto absolute -top-3 -left-3 grid size-10 place-items-center rounded-full shadow-md ring-2 ring-white transition',
        selected ? 'bg-brand text-white' : 'bg-white text-brand hover:scale-105',
      )}
      aria-label="Editar: estilo de la pantalla"
      title="Estilo de la pantalla: colores, tipografía y decoración"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(e.currentTarget)
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.92 }}
    >
      <Palette className="size-5" aria-hidden />
      <span
        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-brand text-white ring-2 ring-white"
        aria-hidden
      >
        <Pencil className="size-2.5" />
      </span>
    </motion.button>
  )
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function VariantPicker({
  variants,
  value,
  onChange,
}: {
  variants: SlideVariant[]
  value: string
  onChange(value: string): void
}) {
  return (
    <div className="mb-4 w-full" role="radiogroup" aria-label="Diseño de esta pantalla">
      <p className="mb-2 text-center text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        Elegí el diseño
      </p>
      <div className="flex justify-center gap-2">
        {variants.map((v) => {
          const on = v.value === value
          return (
            <motion.button
              key={v.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(v.value)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'flex items-center gap-2 rounded-2xl bg-white py-2 pr-4 pl-2 text-sm font-semibold shadow-sm ring-2 transition',
                on
                  ? 'text-ink ring-brand'
                  : 'text-neutral-600 ring-transparent hover:ring-neutral-200',
              )}
            >
              <span
                className="size-8 rounded-xl ring-1 ring-black/10"
                style={{
                  background: `linear-gradient(135deg, ${v.swatch[0]} 50%, ${v.swatch[1]} 50%)`,
                }}
                aria-hidden
              />
              {v.label}
              {on && <Check className="size-4 text-brand" aria-hidden />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/** El globo de edición: junto al elemento tocado (abajo, o arriba si no entra). */
function EditBubble({
  anchor,
  title,
  onClose,
  children,
}: {
  anchor: OpenEditor['anchor']
  title: string
  onClose(): void
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)

  // En el celular es una hoja que sube desde abajo (CSS); desde sm, un globo
  // junto al elemento: se ubica midiéndolo, sin pasar por el estado.
  useLayoutEffect(() => {
    const el = panel.current
    if (!el) return
    if (window.innerWidth < 640) {
      // La hoja tapa la mitad de abajo: la página se corre para que lo tocado
      // (la torta, los globos) quede a la vista arriba y el cambio se vea en vivo.
      const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
      const free = {
        top: Math.max(header, 0) + 8,
        bottom: window.innerHeight - el.offsetHeight - 8,
      }
      const room = free.bottom - free.top
      const target = anchor.height <= room ? free.top + (room - anchor.height) / 2 : free.top
      const delta = anchor.top - target
      if (Math.abs(delta) > 8) window.scrollBy({ top: delta, behavior: 'smooth' })
      return
    }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = el.offsetWidth
    const h = el.offsetHeight
    const below = anchor.top + anchor.height + 12
    const top = below + h < vh - 12 ? below : Math.max(12, anchor.top - h - 12)
    const left = Math.min(Math.max(12, anchor.left + anchor.width / 2 - w / 2), vw - w - 12)
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }, [anchor])

  // El cursor ya en el primer campo: se toca y se escribe.
  useEffect(() => {
    const first = panel.current?.querySelector<HTMLElement>(
      'input:not([type=file]):not([type=hidden]), textarea, select',
    )
    first?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[70] bg-black/10"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[min(56dvh,520px)] flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:inset-x-auto sm:bottom-auto sm:w-[360px] sm:rounded-3xl sm:pb-0"
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: spring.snappy }}
        exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.15 } }}
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3">
          <Pencil className="size-4 text-brand" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </>
  )
}

// ── El campo a editar ───────────────────────────────────────────────────────

function FieldEditor({
  definition,
  slideKey,
  path,
  draft,
  media,
  change,
  onDone,
  showDone = true,
}: {
  definition: SlideDefinition
  slideKey: string
  path: string
  draft: EditorDraft
  media: MediaAdapter
  change: InlineWorkspaceProps['change']
  onDone(): void
  /** Sin su propio "Listo" (el globo pone uno al final, después de los estilos). */
  showDone?: boolean
}) {
  const done = showDone ? <DoneButton onClick={onDone} /> : null

  // Los nombres del regalo.
  if (path === '@recipientName' || path === '@senderName') {
    const key = path === '@recipientName' ? 'recipientName' : 'senderName'
    return (
      <div>
        <Label htmlFor="inline-name">{key === 'recipientName' ? 'Para' : 'De parte de'}</Label>
        <Input
          id="inline-name"
          autoFocus
          value={draft[key]}
          maxLength={40}
          autoComplete="off"
          placeholder={key === 'recipientName' ? 'Su nombre o apodo' : 'Tu nombre'}
          onChange={(e) => {
            const value = e.target.value
            change((d) => ({ ...d, [key]: value }))
          }}
          onKeyDown={(e) => e.key === 'Enter' && onDone()}
        />
        {done}
      </div>
    )
  }

  const shape = definition.buyerSchema ? objectShape(definition.buyerSchema) : null
  if (!shape) return null
  const content = draft.slides[slideKey] ?? {}
  const setContent = (next: Record<string, unknown>) =>
    change((d) => ({ ...d, slides: { ...d.slides, [slideKey]: next } }))

  const segments = path.split('.')
  // Un ítem de una lista: `moments.2`, `wishes.4`.
  if (segments.length === 2 && /^\d+$/.test(segments[1]!)) {
    const listKey = segments[0]!
    const i = Number(segments[1])
    const listSchema = shape[listKey]
    const item = listSchema ? arrayElement(listSchema) : null
    if (!item) return null
    const list = ((content[listKey] as unknown[] | undefined) ?? []).slice()
    const current = list[i]
    const itemShape = objectShape(item)
    const setItem = (next: unknown) => {
      const filled = list.slice()
      // Si se edita un lugar vacío (la 4ª foto sin las anteriores), se completa.
      while (filled.length < i) filled.push(defaultFor(item))
      filled[i] = next
      setContent({ ...content, [listKey]: filled })
    }
    const form = itemShape ? (
      <SchemaForm
        schema={item}
        value={
          (current as Record<string, unknown>) ?? (defaultFor(item) as Record<string, unknown>)
        }
        onChange={setItem}
        idPrefix={`inline-${slideKey}-${listKey}-${i}`}
        media={media}
      />
    ) : (
      <SchemaForm
        schema={z.object({ value: item as z.ZodType })}
        value={{ value: current ?? defaultFor(item) }}
        onChange={(next) => setItem(next.value)}
        idPrefix={`inline-${slideKey}-${listKey}-${i}`}
        media={media}
      />
    )
    return (
      <div>
        {form}
        {i < list.length && (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline"
            onClick={() => {
              setContent({ ...content, [listKey]: list.filter((_, j) => j !== i) })
              onDone()
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Quitar
          </button>
        )}
        {done}
      </div>
    )
  }

  // Uno o varios campos de la slide: `wish`, `age,treatment,birthday`.
  const keys = path.split(',').filter((key) => key in shape)
  if (!keys.length) return null
  const subset = z.object(Object.fromEntries(keys.map((key) => [key, shape[key] as z.ZodType])))
  return (
    <div>
      <SchemaForm
        schema={subset}
        value={content}
        onChange={setContent}
        idPrefix={`inline-${slideKey}`}
        media={media}
        errors={issuesByPath(subset, content)}
      />
      {done}
    </div>
  )
}

// ── Etiquetas y faltantes ───────────────────────────────────────────────────

function fieldSchema(definition: SlideDefinition, path: string): AnySchema | null {
  const shape = definition.buyerSchema ? objectShape(definition.buyerSchema) : null
  if (!shape) return null
  const [head, index] = path.split('.')
  const base = shape[head!]
  if (!base) return null
  if (index !== undefined) return arrayElement(base)
  return base
}

/** El nombre del globo: el del campo o, si la pieza solo tiene estilos, los de sus ejes. */
function hotspotLabel(
  definition: SlideDefinition,
  path: string,
  styles: string[],
  axes: readonly OfferedAxis[],
): string {
  if (path) return labelFor(definition, path)
  const labels = styles.flatMap((key) => axes.find((a) => a.key === key)?.label ?? [])
  return labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)!.toLowerCase()}`
    : (labels[0] ?? 'Estilo')
}

function labelFor(definition: SlideDefinition, path: string): string {
  if (path === '@recipientName') return 'Para quién es'
  if (path === '@senderName') return 'De parte de quién'
  const first = path.split(',')[0]!
  const [head, index] = first.split('.')
  const schema = fieldSchema(definition, first)
  const meta = schema ? getFieldMeta(schema) : undefined
  if (!schema) return 'Editar'
  if (index !== undefined) {
    const list = fieldSchema(definition, head!)
    const listMeta = list ? getFieldMeta(list) : undefined
    const n = Number(index) + 1
    return listMeta?.itemLabel?.replace('{n}', String(n)) ?? `${meta?.label ?? 'Ítem'} ${n}`
  }
  if (path.includes(',')) return definition.editor?.title ?? meta?.label ?? 'Editar'
  return meta?.label ?? 'Editar'
}

/** Rutas obligatorias vacías de la slide (y los nombres, si faltan). */
function missingPaths(
  definition: SlideDefinition,
  content: Record<string, unknown>,
  draft: EditorDraft,
): string[] {
  const out = definition.buyerSchema
    ? missingRequired(definition.buyerSchema, content).map((m) => m.path)
    : []
  if (!draft.recipientName.trim()) out.push('@recipientName')
  if (!draft.senderName.trim()) out.push('@senderName')
  return out
}

function isMissing(missing: string[], hotspotPath: string): boolean {
  return hotspotPath
    .split(',')
    .some((p) => missing.some((m) => m === p || m.startsWith(`${p}.`) || p.startsWith(`${m}.`)))
}
