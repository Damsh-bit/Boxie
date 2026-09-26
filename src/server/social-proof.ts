import 'server-only'
import { purchaseExamples, socialProof as CONFIG } from '@/content/social-proof'
import {
  buildFeed,
  salesToEvents,
  soldMilestone,
  type SaleRow,
  type SocialProof,
} from '@/domain/social-proof'
import { demoDb } from './admin/demo/store'
import { serviceDb } from './db/client'
import { isDemoMode } from './demo'
import { log } from './log'

interface Sales {
  recent: SaleRow[]
  total: number
}

const DAY = 86_400_000
// La home es dinámica: las ventas se leen a lo sumo una vez cada 5 minutos por instancia.
const TTL = 5 * 60_000
let memo: { at: number; sales: Sales } | undefined

function demoSales(since: Date, slugOf: Map<string, string>): Sales {
  const paid = demoDb().orders.filter((o) => o.status === 'paid' && o.paidAt)
  return {
    total: paid.length,
    recent: paid
      .filter((o) => Date.parse(o.paidAt!) >= since.getTime() && slugOf.has(o.themeId))
      .map((o) => ({
        id: o.id,
        buyerName: o.buyerName,
        paidAt: o.paidAt!,
        themeSlug: slugOf.get(o.themeId)!,
      })),
  }
}

/**
 * Las ventas pagadas, con la clave de servicio (la RLS no deja leer órdenes
 * con la pública). Del servidor sale solo el nombre de pila, la temática y la
 * hora: ni apellidos, ni mails, ni montos.
 */
async function dbSales(since: Date, slugOf: Map<string, string>): Promise<Sales> {
  const db = serviceDb()
  const [recent, total] = await Promise.all([
    db
      .from('orders')
      .select('id, buyer_name, paid_at, theme_id')
      .eq('status', 'paid')
      .gte('paid_at', since.toISOString())
      .order('paid_at', { ascending: false })
      .limit(40),
    db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
  ])
  if (recent.error) throw new Error(recent.error.message)
  if (total.error) throw new Error(total.error.message)
  return {
    total: total.count ?? 0,
    recent: recent.data.flatMap((o) =>
      o.paid_at && slugOf.has(o.theme_id)
        ? [
            {
              id: o.id,
              buyerName: o.buyer_name,
              paidAt: o.paid_at,
              themeSlug: slugOf.get(o.theme_id)!,
            },
          ]
        : [],
    ),
  }
}

async function readSales(now: Date, slugOf: Map<string, string>): Promise<Sales> {
  const since = new Date(now.getTime() - CONFIG.windowDays * DAY)
  if (isDemoMode()) return demoSales(since, slugOf)
  if (memo && now.getTime() - memo.at < TTL) return memo.sales
  try {
    const sales = await dbSales(since, slugOf)
    memo = { at: now.getTime(), sales }
    return sales
  } catch (error) {
    log.warn('No se pudieron leer las ventas para la portada: solo ejemplos', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { recent: [], total: 0 }
  }
}

/**
 * La prueba social de la portada. Con las ventas pausadas no se inventa
 * nada: la cinta queda solo con las ventas reales (o no aparece).
 */
export async function getSocialProof({
  themes,
  salesPaused,
}: {
  themes: { id: string; slug: string }[]
  salesPaused: boolean
}): Promise<SocialProof> {
  const now = new Date()
  const slugOf = new Map(themes.map((t) => [t.id, t.slug]))
  const sales = await readSales(now, slugOf)
  return {
    events: buildFeed({
      sales: salesToEvents(sales.recent, now),
      examples: salesPaused ? [] : purchaseExamples,
      examplesUntil: CONFIG.examplesUntil,
      themes: new Set(themes.map((t) => t.slug)),
      max: CONFIG.max,
    }),
    sold: soldMilestone(sales.total, CONFIG.soldFrom),
  }
}
