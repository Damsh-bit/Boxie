import 'server-only'
import { cache } from 'react'
import { welcomeCoupon as WELCOME } from '@/content/home'
import { businessContact, type BusinessContact } from '@/domain/business'
import { describeCoupon, evaluateCoupon } from '@/domain/coupons'
import { recommendedPlan, savingsPercent, type Plan } from '@/domain/plans'
import type { ParsedThemeConfig } from '@/slides/config'
import { configForPlan, isStructural, planContents } from '@/slides/plans'
import type { SlideKind } from '@/slides/schemas'
import {
  findCoupon,
  getPublicSettings,
  getThemeVersionConfig,
  listPublicPlans,
  listPublishedThemes,
  type CatalogThemeWithVersion,
} from './catalog'
import { log } from './log'

/**
 * La vidriera: todo lo que el sitio público muestra y que se decide en el
 * panel (planes, precios, días online, cupones, datos del negocio, ventas
 * pausadas), resumido una sola vez por pedido. Así ninguna página promete un
 * número distinto del que cobra el checkout o entrega el regalo.
 */

export interface StorePlan {
  slug: string
  name: string
  tagline: string
  priceCents: number
  compareAtCents: number | null
  /** Ahorro frente al precio tachado (0 si no hay). */
  savingsPercent: number
  highlighted: boolean
  color: string
  /** Lo que incluye en la temática más completa del catálogo. */
  screens: number
  modules: number
  games: number
  days: number
  maxPhotos: number
  allowPassword: boolean
  features: string[]
}

export interface WelcomeOffer {
  code: string
  /** "10% OFF" · "$500 OFF": sale del cupón real. */
  discount: string
}

export interface Storefront {
  themes: CatalogThemeWithVersion[]
  plans: StorePlan[]
  /** El plan destacado (o el del medio). null sin planes. */
  recommended: StorePlan | null
  /** El precio más bajo: el "desde" del sitio. */
  priceFromCents: number
  /** Pantallas de la Boxie más completa (el plan más alto en la temática más larga). */
  maxScreens: number
  /** Días online del regalo: el mínimo y el máximo entre los planes. */
  lifetimeDays: { min: number; max: number }
  /** Tope de fotos del plan más completo. */
  maxPhotos: number
  /** Sin bloquearla, días que se puede editar desde la compra (Configuración). */
  editWindowDays: number
  /** El cupón de bienvenida, solo si existe y está vigente. */
  welcome: WelcomeOffer | null
  business: BusinessContact
  salesPaused: boolean
  /** Desde qué plan entra cada tipo de pantalla (las que van en todos, no figuran). */
  kindFromPlan: Partial<Record<SlideKind, string>>
  /** Las pantallas del catálogo y desde qué plan vienen (la comparación de /precios). */
  screens: ScreenRow[]
}

const PHOTO_LIMIT = 30

/** Resumen de los planes en todo el catálogo (lo que más incluye cada uno). */
export function summarizePlans(plans: Plan[], configs: ParsedThemeConfig[]): StorePlan[] {
  const contents = configs.map((c) => planContents(c, plans))
  return plans.map((p) => {
    const mine = contents.map((list) => list.find((x) => x.planSlug === p.slug))
    const max = (pick: (c: NonNullable<(typeof mine)[number]>) => number) =>
      Math.max(0, ...mine.map((c) => (c ? pick(c) : 0)))
    return {
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents,
      savingsPercent: savingsPercent(p),
      highlighted: p.highlighted,
      color: p.color,
      screens: max((c) => c.screens),
      modules: max((c) => c.modules),
      games: max((c) => c.games),
      days: p.limits.giftLifetimeDays,
      maxPhotos: p.limits.maxPhotos,
      allowPassword: p.limits.allowPassword,
      features: p.features,
    }
  })
}

/**
 * El primer plan (del más básico al más completo) en el que alguna temática
 * del catálogo incluye cada tipo de pantalla. Las pantallas en el orden en
 * que aparecen.
 */
export function kindFirstPlan(plans: Plan[], configs: ParsedThemeConfig[]): Map<SlideKind, Plan> {
  const first = new Map<SlideKind, Plan>()
  for (const plan of plans) {
    for (const config of configs) {
      for (const slide of configForPlan(config, plan, plans).slides) {
        if (!first.has(slide.kind)) first.set(slide.kind, plan)
      }
    }
  }
  return first
}

/** Desde qué plan (nombre) viene cada pantalla que no está en el plan más básico. */
export function kindTiers(
  plans: Plan[],
  configs: ParsedThemeConfig[],
): Partial<Record<SlideKind, string>> {
  const tiers: Partial<Record<SlideKind, string>> = {}
  for (const [kind, plan] of kindFirstPlan(plans, configs)) {
    // Lo que ya está en el plan más básico va en todos: no lleva etiqueta.
    if (plan.id !== plans[0]?.id && !isStructural(kind)) tiers[kind] = plan.name
  }
  return tiers
}

/** Una fila de la comparación de planes: la pantalla y desde qué plan viene. */
export interface ScreenRow {
  kind: SlideKind
  /** Slug del primer plan que la incluye. */
  fromPlan: string
}

/** Las pantallas que se venden (sin las de apertura y cierre), en su orden. */
export function screenRows(plans: Plan[], configs: ParsedThemeConfig[]): ScreenRow[] {
  return [...kindFirstPlan(plans, configs)]
    .filter(([kind]) => !isStructural(kind))
    .map(([kind, plan]) => ({ kind, fromPlan: plan.slug }))
}

async function welcomeOffer(): Promise<WelcomeOffer | null> {
  try {
    const found = await findCoupon(WELCOME.code)
    const evaluation = evaluateCoupon(found, new Date())
    return evaluation.ok
      ? { code: evaluation.coupon.code, discount: describeCoupon(evaluation.coupon) }
      : null
  } catch (error) {
    log.warn('No se pudo validar el cupón de bienvenida: no se muestra', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export const getStorefront = cache(async (): Promise<Storefront> => {
  const [themes, settings, plans, welcome] = await Promise.all([
    listPublishedThemes(),
    getPublicSettings(),
    listPublicPlans(),
    welcomeOffer(),
  ])
  const configs = (await Promise.all(themes.map((t) => getThemeVersionConfig(t.versionId)))).filter(
    (c): c is ParsedThemeConfig => c !== null,
  )
  const storePlans = summarizePlans(plans, configs)
  const recommended = recommendedPlan(plans)
  const longest = Math.max(0, ...configs.map((c) => c.slides.length))
  const days = storePlans.length ? storePlans.map((p) => p.days) : [settings.giftLifetimeDays]
  const priceFromCents = storePlans.length
    ? Math.min(...storePlans.map((p) => p.priceCents))
    : themes.length
      ? Math.min(...themes.map((t) => t.priceCents))
      : settings.basePriceCents

  return {
    themes,
    plans: storePlans,
    recommended: storePlans.find((p) => p.slug === recommended?.slug) ?? null,
    priceFromCents,
    maxScreens: storePlans.length ? Math.max(...storePlans.map((p) => p.screens)) : longest,
    lifetimeDays: { min: Math.min(...days), max: Math.max(...days) },
    maxPhotos: storePlans.length ? Math.max(...storePlans.map((p) => p.maxPhotos)) : PHOTO_LIMIT,
    editWindowDays: settings.giftLifetimeDays,
    welcome,
    business: businessContact(settings.business, 'Hola Boxie 👋 Tengo una consulta'),
    salesPaused: settings.salesPaused,
    kindFromPlan: kindTiers(plans, configs),
    screens: screenRows(plans, configs),
  }
})
