import type { ChannelId } from '@/domain/marketing/channels'
import { SERIES } from '../../../_ui/palette'

/**
 * Color de cada canal en los gráficos de Marketing. Sigue al canal, nunca a
 * su puesto en un ranking (Meta es siempre coral, Google siempre azul…). Hay
 * seis colores de serie validados: los seis canales que más pesan en una
 * tienda como Boxie tienen el suyo y el resto se agrupa en "Otros" (gris).
 * Vive aparte de los componentes de cliente para que los Server Components
 * lo puedan usar.
 */
export const CHANNEL_COLOR: Partial<Record<ChannelId, string>> = {
  meta: SERIES[0],
  google: SERIES[1],
  social: SERIES[2],
  directo: SERIES[3],
  seo: SERIES[4],
  influencers: SERIES[5],
}

/** "Otros": neutro, sin identidad propia. */
export const OTHER_COLOR = '#b9afb5'

export const channelColor = (id: ChannelId) => CHANNEL_COLOR[id] ?? OTHER_COLOR

export const hasOwnColor = (id: ChannelId) => id in CHANNEL_COLOR
