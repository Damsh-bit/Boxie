import 'server-only'
import type { BoxieLifecycle } from '@/domain/boxie'
import type { Coupon } from '@/domain/coupons'
import type { Plan } from '@/domain/plans'
import type { Tables } from './db/database.types'

/** De filas de la base (snake_case, fechas como string) a tipos de dominio. */

const date = (v: string | null) => (v ? new Date(v) : null)

export function toCoupon(row: Tables<'coupons'>): Coupon {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    value: row.value,
    active: row.active,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    startsAt: date(row.starts_at),
    expiresAt: date(row.expires_at),
    affiliateId: row.affiliate_id,
  }
}

export function toLifecycle(
  row: Pick<Tables<'boxies'>, 'status' | 'locked_at' | 'expires_at'>,
): BoxieLifecycle {
  return { status: row.status, lockedAt: date(row.locked_at), expiresAt: new Date(row.expires_at) }
}

export function toPlan(row: Tables<'plans'>): Plan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents,
    rank: row.rank,
    color: row.color,
    features: Array.isArray(row.features)
      ? row.features.filter((f): f is string => typeof f === 'string')
      : [],
    limits: {
      giftLifetimeDays: row.gift_lifetime_days,
      maxPhotos: row.max_photos,
      allowPassword: row.allow_password,
    },
    highlighted: row.highlighted,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
