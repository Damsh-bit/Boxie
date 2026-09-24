'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { z } from 'zod'
import { cn } from '@/ui/cn'
import { FieldMessage, Input, Label, Select, Textarea } from '@/ui/form'
import { Collapse, ease, spring } from '@/ui/motion'
import {
  arrayElement,
  getFieldMeta,
  objectShape,
  youtubeId,
  type BuyerPhoto,
  type FieldMeta,
} from '../fields'
import { markupToRich, richToMarkup, type RichText } from '../rich-text'
import { getIn, moveItem, setIn, type Path } from './draft'
import { PhotoField, type MediaAdapter } from './PhotoField'
import { defaultFor, lengthLimits, numberLimits } from './schema-info'

/**
 * Formulario generado desde un schema de Zod (docs/ARQUITECTURA.md §4.3).
 *
 * Recorre el schema y dibuja cada campo según el widget de sus metadatos
 * (fields.ts): texto, foto, link de YouTube, listas, grupos… El editor del
 * comprador lo usa con el `buyerSchema` de cada slide y el constructor de
 * temáticas del panel lo va a usar con el `themeSchema`: una slide nueva no
 * obliga a escribir ningún formulario.
 */

type AnySchema = z.core.$ZodType

export interface SchemaFormProps {
  schema: AnySchema
  value: unknown
  onChange(next: Record<string, unknown>): void
  /** Prefijo de los id de los campos (tiene que ser único en la página). */
  idPrefix: string
  media?: MediaAdapter
  /** Errores por ruta relativa al schema ("coupons.2.title"). */
  errors?: Record<string, string>
  disabled?: boolean
}

interface Ctx {
  idPrefix: string
  media?: MediaAdapter
  errors: Record<string, string>
  disabled: boolean
  root: Record<string, unknown>
  set(path: Path, value: unknown): void
}

export function SchemaForm({
  schema,
  value,
  onChange,
  idPrefix,
  media,
  errors = {},
  disabled = false,
}: SchemaFormProps) {
  const shape = objectShape(schema)
  const root = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  // Los cambios que llegan tarde (una foto que termina de subir) se aplican
  // sobre el valor de ese momento, no sobre el de cuando empezaron: si no,
  // pisarían lo que se escribió mientras tanto.
  const latest = useRef(root)
  useLayoutEffect(() => {
    latest.current = root
  })
  if (!shape) return null
  const ctx: Ctx = {
    idPrefix,
    media,
    errors,
    disabled,
    root,
    set: (path, next) => {
      const updated = setIn(latest.current, path, next)
      latest.current = updated
      onChange(updated)
    },
  }
  return <Fields shape={shape} path={[]} ctx={ctx} />
}

function Fields({ shape, path, ctx }: { shape: Record<string, AnySchema>; path: Path; ctx: Ctx }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const entries = Object.entries(shape).filter(([, s]) => getFieldMeta(s))
  const main = entries.filter(([, s]) => !getFieldMeta(s)?.advanced)
  const advanced = entries.filter(([, s]) => getFieldMeta(s)?.advanced)
  const advancedId = `${idOf(ctx, path)}-mas`
  return (
    <div className="space-y-5">
      {main.map(([key, s]) => (
        <FieldFor key={key} schema={s} path={[...path, key]} ctx={ctx} />
      ))}
      {advanced.length > 0 && (
        <div className="rounded-2xl border border-neutral-200">
          <button
            type="button"
            aria-expanded={showAdvanced}
            aria-controls={advancedId}
            onClick={() => setShowAdvanced((o) => !o)}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:text-ink"
          >
            Más opciones
            <motion.span animate={{ rotate: showAdvanced ? 180 : 0 }} transition={spring.snappy}>
              <ChevronDown className="size-4" aria-hidden />
            </motion.span>
          </button>
          <Collapse open={showAdvanced} id={advancedId}>
            <div className="space-y-5 px-4 pt-1 pb-4">
              {advanced.map(([key, s]) => (
                <FieldFor key={key} schema={s} path={[...path, key]} ctx={ctx} />
              ))}
            </div>
          </Collapse>
        </div>
      )}
    </div>
  )
}

const idOf = (ctx: Ctx, path: Path) => `${ctx.idPrefix}-${path.join('-')}`

/** Vista previa que aparece debajo de un campo (miniatura de YouTube, imagen). */
function Appear({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className="overflow-hidden"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={spring.soft}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FieldFor({ schema, path, ctx }: { schema: AnySchema; path: Path; ctx: Ctx }) {
  const meta = getFieldMeta(schema)
  if (!meta) return null
  const id = idOf(ctx, path)
  const value = getIn(ctx.root, path)
  const set = (next: unknown) => ctx.set(path, next)
  const error = ctx.errors[path.join('.')]
  const shell = (control: ReactNode, extra?: { counter?: ReactNode; htmlFor?: string | null }) => (
    <FieldShell
      id={id}
      htmlFor={extra?.htmlFor === null ? undefined : (extra?.htmlFor ?? id)}
      meta={meta}
      error={error}
      counter={extra?.counter}
    >
      {control}
    </FieldShell>
  )

  switch (meta.widget) {
    case 'text':
    case 'textarea': {
      const text = typeof value === 'string' ? value : ''
      const { max } = lengthLimits(schema)
      const common = {
        id,
        value: text,
        maxLength: max,
        placeholder: meta.placeholder,
        disabled: ctx.disabled,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': meta.help || error ? `${id}-hint` : undefined,
      }
      return shell(
        meta.widget === 'textarea' ? (
          <Textarea {...common} rows={4} onChange={(e) => set(e.target.value)} />
        ) : (
          <Input {...common} onChange={(e) => set(e.target.value)} />
        ),
        { counter: max ? <Counter length={text.length} max={max} /> : null },
      )
    }

    case 'richtext':
      return shell(
        <RichTextInput
          id={id}
          value={value as RichText | undefined}
          onChange={set}
          disabled={ctx.disabled}
        />,
      )

    case 'photo':
      return shell(
        <PhotoField
          id={id}
          value={(value as BuyerPhoto | null) ?? null}
          onChange={set}
          media={ctx.media}
          disabled={ctx.disabled}
          describedBy={meta.help ? `${id}-hint` : undefined}
        />,
        { htmlFor: null },
      )

    case 'youtube': {
      const text = typeof value === 'string' ? value : ''
      const videoId = youtubeId(text)
      return shell(
        <>
          <Input
            id={id}
            type="url"
            inputMode="url"
            value={text}
            placeholder={meta.placeholder ?? 'https://youtu.be/…'}
            disabled={ctx.disabled}
            aria-invalid={error ? true : undefined}
            onChange={(e) => set(e.target.value.trim())}
          />
          <Appear show={!!videoId}>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-neutral-50 p-2">
              <motion.img
                key={videoId}
                src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
                alt=""
                className="h-12 w-20 shrink-0 rounded-lg object-cover"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring.bouncy}
              />
              <span className="text-sm font-medium text-green-700">✓ Video de YouTube listo</span>
            </div>
          </Appear>
        </>,
      )
    }

    case 'url':
    case 'image':
    case 'video': {
      const text = typeof value === 'string' ? value : ''
      return shell(
        <>
          <Input
            id={id}
            type="url"
            inputMode="url"
            value={text}
            placeholder={meta.placeholder ?? 'https://…'}
            disabled={ctx.disabled}
            aria-invalid={error ? true : undefined}
            onChange={(e) => set(e.target.value.trim())}
          />
          <Appear show={meta.widget === 'image' && !!text}>
            <img
              src={text}
              alt=""
              className="mt-3 h-20 w-32 rounded-xl border border-neutral-200 object-cover"
            />
          </Appear>
        </>,
      )
    }

    case 'color': {
      const color = typeof value === 'string' ? value : '#000000'
      return shell(
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label={meta.label}
            value={color}
            disabled={ctx.disabled}
            onChange={(e) => set(e.target.value.toUpperCase())}
            className="size-11 cursor-pointer rounded-xl border border-neutral-200 bg-white p-1"
          />
          <Input
            id={id}
            value={color}
            maxLength={7}
            disabled={ctx.disabled}
            onChange={(e) => set(e.target.value)}
            className="w-32 font-mono"
          />
        </div>,
      )
    }

    case 'select':
      return shell(
        <Select
          id={id}
          value={typeof value === 'string' ? value : ''}
          disabled={ctx.disabled}
          onChange={(e) => set(e.target.value)}
        >
          {meta.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>,
      )

    case 'toggle':
      return (
        <div className="flex items-start justify-between gap-4">
          <div>
            <span id={`${id}-label`} className="text-sm font-semibold text-ink">
              {meta.label}
            </span>
            {meta.help && <p className="mt-0.5 text-xs text-neutral-500">{meta.help}</p>}
          </div>
          <Switch
            id={id}
            labelledBy={`${id}-label`}
            checked={value === true}
            disabled={ctx.disabled}
            onChange={set}
          />
        </div>
      )

    case 'number': {
      const { min, max, int } = numberLimits(schema)
      return shell(
        <Input
          id={id}
          type="number"
          inputMode={int ? 'numeric' : 'decimal'}
          min={min}
          max={max}
          step={int ? 1 : 'any'}
          value={typeof value === 'number' ? value : ''}
          disabled={ctx.disabled}
          onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))}
          className="w-32"
        />,
      )
    }

    case 'list':
      return <ListField schema={schema} meta={meta} path={path} ctx={ctx} />

    case 'group': {
      const shape = objectShape(schema)
      if (!shape) return null
      return (
        <fieldset className="rounded-2xl border border-neutral-200 p-4">
          <legend className="px-1 text-sm font-semibold text-ink">{meta.label}</legend>
          <Fields shape={shape} path={path} ctx={ctx} />
        </fieldset>
      )
    }
  }
}

function FieldShell({
  id,
  htmlFor,
  meta,
  error,
  counter,
  children,
}: {
  id: string
  htmlFor?: string
  meta: FieldMeta
  error?: string
  counter?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor} id={`${id}-label`}>
          {meta.label}
          {meta.required && (
            <span className="ml-1 text-brand" aria-label="obligatorio">
              *
            </span>
          )}
        </Label>
        {counter}
      </div>
      {children}
      <FieldMessage id={`${id}-hint`} error={error} hint={meta.help} />
    </div>
  )
}

function Counter({ length, max }: { length: number; max: number }) {
  const near = length >= max * 0.9
  return (
    <span
      className={cn(
        'text-[11px] tabular-nums transition-colors duration-300',
        near ? 'font-semibold text-amber-600' : 'text-neutral-400',
      )}
      aria-hidden
    >
      {length}/{max}
    </span>
  )
}

function Switch({
  id,
  labelledBy,
  checked,
  disabled,
  onChange,
}: {
  id: string
  labelledBy: string
  checked: boolean
  disabled?: boolean
  onChange(next: boolean): void
}) {
  return (
    <motion.button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full disabled:opacity-50"
      initial={false}
      animate={{ backgroundColor: checked ? '#f44e63' : '#d4d4d4' }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.2 }}
    >
      <motion.span
        className="absolute top-1 left-1 size-5 rounded-full bg-white shadow"
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={spring.snappy}
      />
    </motion.button>
  )
}

/** Texto enriquecido con la notación del panel (**negrita**, *acento*, ==resaltado==). */
function RichTextInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: RichText | undefined
  onChange(next: RichText): void
  disabled?: boolean
}) {
  // El texto se edita tal cual: convertirlo en cada tecla movería el cursor.
  const [text, setText] = useState(() => richToMarkup(value))
  return (
    <>
      <Textarea
        id={id}
        value={text}
        rows={3}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value)
          onChange(markupToRich(e.target.value))
        }}
      />
      <p className="mt-1 text-[11px] text-neutral-400">
        **negrita** · *acento* · ==resaltado== · _itálica_ · Enter = salto de línea
      </p>
    </>
  )
}

/**
 * Claves estables para los ítems de una lista: así, al agregar, quitar o
 * reordenar, cada ítem se anima desde donde estaba (y el foco no salta).
 */
function useItemKeys(length: number) {
  const [state, setState] = useState(() => ({
    keys: Array.from({ length }, (_, i) => `i${i}`),
    next: length,
  }))
  // Si la lista cambió de largo desde afuera (volver a empezar), se ajusta.
  if (state.keys.length !== length) {
    const keys = state.keys.slice(0, length)
    let next = state.next
    while (keys.length < length) keys.push(`i${next++}`)
    setState({ keys, next })
  }
  return {
    keys: state.keys,
    add: () => setState((s) => ({ keys: [...s.keys, `i${s.next}`], next: s.next + 1 })),
    remove: (i: number) => setState((s) => ({ ...s, keys: s.keys.filter((_, j) => j !== i) })),
    move: (from: number, to: number) =>
      setState((s) => ({ ...s, keys: moveItem(s.keys, from, to) })),
  }
}

function ListField({
  schema,
  meta,
  path,
  ctx,
}: {
  schema: AnySchema
  meta: FieldMeta
  path: Path
  ctx: Ctx
}) {
  const element = arrayElement(schema)
  const raw = getIn(ctx.root, path)
  const items = Array.isArray(raw) ? raw : []
  const keys = useItemKeys(items.length)
  if (!element) return null
  const { min = 0, max } = lengthLimits(schema)
  const elementMeta = getFieldMeta(element)
  const elementShape = objectShape(element)
  const itemLabel = (i: number) =>
    (meta.itemLabel ?? `${elementMeta?.label ?? 'Ítem'} {n}`).replace('{n}', String(i + 1))
  const id = idOf(ctx, path)
  const error = ctx.errors[path.join('.')]
  const set = (next: unknown[]) => ctx.set(path, next)
  const canAdd = max === undefined || items.length < max
  const canRemove = items.length > min
  const noun = (elementMeta?.label ?? 'ítem').toLowerCase()

  const move = (from: number, to: number) => {
    keys.move(from, to)
    set(moveItem(items, from, to))
  }
  const remove = (i: number) => {
    keys.remove(i)
    set(items.filter((_, j) => j !== i))
  }
  const add = () => {
    keys.add()
    set([...items, defaultFor(element)])
  }

  return (
    <fieldset aria-describedby={meta.help ? `${id}-hint` : undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <legend className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
          {meta.label}
          {meta.required && <span className="ml-1 text-brand">*</span>}
        </legend>
        {max !== undefined && (
          <span className="text-[11px] text-neutral-400 tabular-nums">
            {items.length}/{max}
          </span>
        )}
      </div>
      {meta.help && (
        <p id={`${id}-hint`} className="-mt-1 mb-3 text-xs text-neutral-500">
          {meta.help}
        </p>
      )}

      <ol className={cn('relative', elementShape ? 'space-y-3' : 'space-y-2')}>
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => {
            const controls = (
              <ItemControls
                label={itemLabel(i)}
                disabled={ctx.disabled}
                onUp={i > 0 ? () => move(i, i - 1) : undefined}
                onDown={i < items.length - 1 ? () => move(i, i + 1) : undefined}
                onRemove={canRemove ? () => remove(i) : undefined}
              />
            )
            const motionProps = {
              layout: 'position' as const,
              initial: { opacity: 0, y: -10, scale: 0.97 },
              animate: { opacity: 1, y: 0, scale: 1 },
              exit: { opacity: 0, scale: 0.94, transition: { duration: 0.18 } },
              transition: spring.soft,
            }
            if (elementShape) {
              return (
                <motion.li
                  key={keys.keys[i] ?? i}
                  {...motionProps}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{itemLabel(i)}</span>
                    {controls}
                  </div>
                  <Fields shape={elementShape} path={[...path, i]} ctx={ctx} />
                </motion.li>
              )
            }
            const itemPath = [...path, i]
            const itemId = idOf(ctx, itemPath)
            const itemError = ctx.errors[itemPath.join('.')]
            const { max: itemMax } = lengthLimits(element)
            return (
              <motion.li key={keys.keys[i] ?? i} {...motionProps}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 shrink-0 text-right text-xs font-bold text-neutral-400 tabular-nums"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <Input
                    id={itemId}
                    aria-label={itemLabel(i)}
                    value={typeof item === 'string' ? item : ''}
                    maxLength={itemMax}
                    disabled={ctx.disabled}
                    aria-invalid={itemError ? true : undefined}
                    onChange={(e) => ctx.set(itemPath, e.target.value)}
                    className="py-2.5"
                  />
                  {controls}
                </div>
                <FieldMessage error={itemError} className="ml-8" />
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>

      <AnimatePresence initial={false}>
        {canAdd && (
          <motion.button
            type="button"
            disabled={ctx.disabled}
            onClick={add}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand/50 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={spring.snappy}
          >
            <Plus className="size-4" aria-hidden /> Agregar {noun}
          </motion.button>
        )}
      </AnimatePresence>
      <FieldMessage error={error} className="mt-2" />
    </fieldset>
  )
}

function ItemControls({
  label,
  disabled,
  onUp,
  onDown,
  onRemove,
}: {
  label: string
  disabled: boolean
  onUp?: () => void
  onDown?: () => void
  onRemove?: () => void
}) {
  const button =
    'grid size-8 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-white hover:text-ink disabled:pointer-events-none disabled:opacity-30'
  const tap = { whileTap: { scale: 0.85 }, transition: { duration: 0.12, ease: ease.out } }
  return (
    <div className="flex shrink-0 items-center">
      <motion.button
        type="button"
        className={button}
        onClick={onUp}
        disabled={disabled || !onUp}
        aria-label={`Subir ${label}`}
        {...tap}
      >
        <ArrowUp className="size-4" aria-hidden />
      </motion.button>
      <motion.button
        type="button"
        className={button}
        onClick={onDown}
        disabled={disabled || !onDown}
        aria-label={`Bajar ${label}`}
        {...tap}
      >
        <ArrowDown className="size-4" aria-hidden />
      </motion.button>
      <motion.button
        type="button"
        className={cn(button, 'hover:text-red-600')}
        onClick={onRemove}
        disabled={disabled || !onRemove}
        aria-label={`Quitar ${label}`}
        {...tap}
      >
        <X className="size-4" aria-hidden />
      </motion.button>
    </div>
  )
}
