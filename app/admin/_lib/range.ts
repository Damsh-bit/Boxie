import 'server-only'
import {
  addDays,
  arDayKey,
  bucketFor,
  bucketLabel,
  formatRange,
  parseRange,
  type DateRange,
} from '@/domain/admin/range'

type Params = Record<string, string | string[] | undefined>

/** El período de la URL, con todo lo que el selector y los gráficos necesitan. */
export function rangeFromParams(
  params: Params,
  fallback: Parameters<typeof parseRange>[2] = '30d',
) {
  const range = parseRange(params, new Date(), fallback)
  const bucket = bucketFor(range)
  return {
    range,
    bucket,
    picker: {
      preset: range.preset,
      label: formatRange(range),
      from: arDayKey(range.from),
      to: arDayKey(addDays(range.to, -1)),
    },
    label: (key: string) => bucketLabel(key, bucket),
  }
}

export type RangeInfo = ReturnType<typeof rangeFromParams>
export type { DateRange }

export function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}
