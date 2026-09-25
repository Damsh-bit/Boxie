'use client'

import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { ArrowUpRight, GripVertical, ImagePlus, Lock, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import type { ThemeListing } from '@/domain/catalog'
import { cn } from '@/ui/cn'
import { Field, Input, Select, Textarea } from '@/ui/form'
import { spring } from '@/ui/motion'
import { ListInput } from '../../../_ui/fields'
import { Card } from '../../../_ui/primitives'

export interface ThemeMeta {
  name: string
  slug: string
  category: string
  description: string
  sortOrder: number
  priceCents: number | null
}

/** Imágenes que la tienda puede mostrar (next/image solo acepta hosts configurados). */
export function isAllowedImage(url: string): boolean {
  return (
    url.startsWith('/') ||
    url.startsWith('https://images.unsplash.com/') ||
    /\.supabase\.co\//.test(url)
  )
}

/**
 * La ficha comercial: cómo se ve la temática en la tienda (tarjeta de la
 * galería y página de producto), con la tarjeta real al lado.
 */
export function ListingTab({
  meta,
  onMeta,
  listing,
  onListing,
  categories,
  slugLocked,
  fields,
}: {
  meta: ThemeMeta
  onMeta(meta: ThemeMeta): void
  listing: ThemeListing
  onListing(listing: ThemeListing): void
  categories: string[]
  slugLocked: boolean
  fields: Record<string, string>
}) {
  const [newImage, setNewImage] = useState('')
  const set = <K extends keyof ThemeListing>(key: K, value: ThemeListing[K]) =>
    onListing({ ...listing, [key]: value })
  const imageError =
    newImage && !/^(\/|https:\/\/)/.test(newImage)
      ? 'Tiene que ser una URL https o una ruta del sitio'
      : newImage && !isAllowedImage(newImage)
        ? 'La tienda solo muestra imágenes de Unsplash, de Supabase Storage o del sitio'
        : null

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <h3 className="mb-4 font-semibold text-ink">Datos de la temática</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="meta-name" error={fields.name}>
              <Input
                id="meta-name"
                value={meta.name}
                maxLength={80}
                onChange={(e) => onMeta({ ...meta, name: e.target.value })}
              />
            </Field>
            <Field
              label="Dirección en la tienda"
              htmlFor="meta-slug"
              error={fields.slug}
              hint={
                slugLocked
                  ? 'Ya se publicó: cambiarla rompería los links compartidos.'
                  : `/tematicas/${meta.slug}`
              }
            >
              <div className="relative">
                <Input
                  id="meta-slug"
                  value={meta.slug}
                  disabled={slugLocked}
                  maxLength={60}
                  className="pr-10 font-mono text-sm"
                  onChange={(e) =>
                    onMeta({
                      ...meta,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                />
                {slugLocked && (
                  <Lock
                    className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden
                  />
                )}
              </div>
            </Field>
            <Field
              label="Categoría"
              htmlFor="meta-category"
              error={fields.category}
              hint="Agrupa las temáticas en la galería"
            >
              <Input
                id="meta-category"
                list="theme-categories"
                value={meta.category}
                maxLength={40}
                onChange={(e) => onMeta({ ...meta, category: e.target.value })}
              />
              <datalist id="theme-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field
              label="Orden en la tienda"
              htmlFor="meta-order"
              error={fields.sortOrder}
              hint="Menor = aparece antes"
            >
              <Input
                id="meta-order"
                type="number"
                min={0}
                value={meta.sortOrder}
                onChange={(e) => onMeta({ ...meta, sortOrder: Number(e.target.value || 0) })}
              />
            </Field>
            <Field
              label="Descripción interna"
              htmlFor="meta-description"
              className="sm:col-span-2"
              error={fields.description}
            >
              <Textarea
                id="meta-description"
                value={meta.description}
                maxLength={300}
                rows={2}
                onChange={(e) => onMeta({ ...meta, description: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-ink">Tarjeta y página de producto</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Antes del nombre" htmlFor="l-title" hint='"Boxie para", "Boxie de"…'>
              <Input
                id="l-title"
                value={listing.title}
                maxLength={40}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>
            <Field label="Nombre destacado" htmlFor="l-highlight">
              <Input
                id="l-highlight"
                value={listing.highlight}
                maxLength={40}
                onChange={(e) => set('highlight', e.target.value)}
              />
            </Field>
            <Field label="Subtítulo de la ficha" htmlFor="l-subtitle" className="sm:col-span-2">
              <Input
                id="l-subtitle"
                value={listing.subtitle}
                maxLength={160}
                onChange={(e) => set('subtitle', e.target.value)}
              />
            </Field>
            <Field label="Texto de la tarjeta" htmlFor="l-card" className="sm:col-span-2">
              <Textarea
                id="l-card"
                value={listing.cardDescription}
                maxLength={200}
                rows={2}
                onChange={(e) => set('cardDescription', e.target.value)}
              />
            </Field>
            <Field label="Color de la tarjeta" htmlFor="l-color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={listing.cardColor}
                  onChange={(e) => set('cardColor', e.target.value.toUpperCase())}
                  className="size-11 cursor-pointer rounded-xl border border-line bg-white p-1"
                  aria-label="Elegir color"
                />
                <Input
                  id="l-color"
                  value={listing.cardColor}
                  maxLength={7}
                  className="w-32 font-mono"
                  onChange={(e) => set('cardColor', e.target.value)}
                />
              </div>
            </Field>
            <Field label="Texto sobre el color" htmlFor="l-tone">
              <Select
                id="l-tone"
                value={listing.cardTone}
                onChange={(e) => set('cardTone', e.target.value as 'light' | 'dark')}
              >
                <option value="light">Claro (fondos oscuros)</option>
                <option value="dark">Oscuro (fondos claros)</option>
              </Select>
            </Field>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
              Fotos{' '}
              <span className="font-normal normal-case">
                (la primera es la principal; arrastrá para ordenar)
              </span>
            </p>
            <Reorder.Group
              axis="x"
              values={listing.images}
              onReorder={(images) => set('images', images)}
              className="flex flex-wrap gap-3"
            >
              <AnimatePresence initial={false}>
                {listing.images.map((src, i) => (
                  <Reorder.Item
                    key={src}
                    value={src}
                    className="group relative size-28 cursor-grab overflow-hidden rounded-2xl border border-line bg-canvas active:cursor-grabbing"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileDrag={{ scale: 1.06, zIndex: 10 }}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="112px"
                      className="pointer-events-none object-cover"
                      unoptimized
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">
                        Principal
                      </span>
                    )}
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-white/90 p-1 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="size-3" aria-hidden />
                    </span>
                    <button
                      type="button"
                      disabled={listing.images.length <= 1}
                      onClick={() =>
                        set(
                          'images',
                          listing.images.filter((x) => x !== src),
                        )
                      }
                      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-neutral-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-critical disabled:hidden"
                      aria-label="Quitar foto"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
            {listing.images.length < 8 && (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const url = newImage.trim()
                  if (!url || imageError || listing.images.includes(url)) return
                  set('images', [...listing.images, url])
                  setNewImage('')
                }}
              >
                <Input
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://images.unsplash.com/… o /themes/foto.jpg"
                  className="py-2 text-sm"
                  aria-label="URL de una foto"
                  aria-invalid={imageError ? true : undefined}
                />
                <button
                  type="submit"
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  <ImagePlus className="size-4" aria-hidden /> Agregar
                </button>
              </form>
            )}
            {imageError && <p className="mt-1.5 text-xs font-medium text-critical">{imageError}</p>}
            {fields.images && (
              <p className="mt-1.5 text-xs font-medium text-critical">{fields.images}</p>
            )}
            <p className="mt-1.5 text-xs text-neutral-500">
              Subir fotos al storage llega con la base de datos; mientras, se usan links.
            </p>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
              Qué incluye (ficha)
            </p>
            <ListInput
              values={listing.features}
              onChange={(v) => set('features', v)}
              max={10}
              maxLength={120}
              placeholder="Ej.: Su canción sonando de fondo."
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[88px_1fr]">
            <Field label="Emoji" htmlFor="g-emoji">
              <Input
                id="g-emoji"
                value={listing.guide?.emoji ?? ''}
                maxLength={16}
                className="text-center text-xl"
                onChange={(e) =>
                  set('guide', {
                    emoji: e.target.value,
                    title: listing.guide?.title ?? '',
                    text: listing.guide?.text ?? '',
                  })
                }
              />
            </Field>
            <Field
              label="Guía: título"
              htmlFor="g-title"
              hint="La tarjetita de ayuda de la galería"
            >
              <Input
                id="g-title"
                value={listing.guide?.title ?? ''}
                maxLength={60}
                onChange={(e) =>
                  set('guide', {
                    emoji: listing.guide?.emoji ?? '🎁',
                    title: e.target.value,
                    text: listing.guide?.text ?? '',
                  })
                }
              />
            </Field>
            <Field label="Guía: texto" htmlFor="g-text" className="sm:col-span-2">
              <Textarea
                id="g-text"
                value={listing.guide?.text ?? ''}
                maxLength={300}
                rows={2}
                onChange={(e) =>
                  set('guide', {
                    emoji: listing.guide?.emoji ?? '🎁',
                    title: listing.guide?.title ?? '',
                    text: e.target.value,
                  })
                }
              />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-3 text-sm font-semibold text-ink">Así se ve en la galería</p>
        <StoreCardPreview meta={meta} listing={listing} />
        <p className="mt-6 mb-3 text-sm font-semibold text-ink">Encabezado de la ficha</p>
        <div className="rounded-[24px] border border-line bg-white p-5">
          <p className="font-display text-3xl leading-tight font-bold text-ink">
            {listing.title} <span className="text-brand">{listing.highlight || meta.name}</span>
          </p>
          <p className="mt-2 text-sm text-neutral-600">{listing.subtitle}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-neutral-700">
            {listing.features.slice(0, 5).map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function StoreCardPreview({ meta, listing }: { meta: ThemeMeta; listing: ThemeListing }) {
  const src = listing.images[1] ?? listing.images[0]
  return (
    <motion.article
      className="group overflow-hidden rounded-[24px] border border-neutral-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
      whileHover={{ y: -6, boxShadow: '0 24px 50px rgba(42,36,51,0.12)' }}
      transition={spring.soft}
    >
      <div className="relative h-52 overflow-hidden" style={{ background: listing.cardColor }}>
        {src && isAllowedImage(src) && (
          <Image
            src={src}
            alt=""
            fill
            sizes="360px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
        )}
      </div>
      <div className="flex items-start gap-3 p-5">
        <div className="min-w-0 flex-1">
          <span className="mb-2 block text-xs font-extrabold tracking-wider text-brand uppercase">
            {meta.category}
          </span>
          <h3 className="mb-2 text-2xl font-semibold text-neutral-900">{meta.name}</h3>
          <p className="text-[0.95rem] leading-relaxed text-neutral-500">
            {listing.cardDescription || meta.description}
          </p>
        </div>
        <span
          className={cn(
            'mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-transform group-hover:rotate-45',
          )}
          aria-hidden
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>
    </motion.article>
  )
}
