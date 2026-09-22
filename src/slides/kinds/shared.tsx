import { useEffect, useState } from 'react'
import type { BuyerPropsOf, SlideKind, ThemePropsOf } from '../schemas'
import type { SlideComponentProps } from '../types'

export type Props<K extends SlideKind> = SlideComponentProps<ThemePropsOf<K>, BuyerPropsOf<K>>

/**
 * true desde la primera vez que la slide está en pantalla. Las secuencias con
 * timers arrancan acá: en el prototipo arrancaban al montarse, que era cuando
 * la slide todavía estaba a una de distancia, y llegaban adelantadas.
 */
export function useActivated(active: boolean): boolean {
  const [activated, setActivated] = useState(active)
  // Estado derivado: se ajusta durante el render, sin un efecto de por medio.
  if (active && !activated) setActivated(true)
  return activated || active
}

/** Paso de una secuencia: 0 al activarse, y avanza a los ms indicados. */
export function useSequence(active: boolean, delays: number[], restartKey = 0): number {
  const activated = useActivated(active)
  const [state, setState] = useState({ step: 0, run: restartKey })
  if (state.run !== restartKey) setState({ step: 0, run: restartKey })
  const key = delays.join(',')
  useEffect(() => {
    if (!activated) return
    const timers = key
      .split(',')
      .filter(Boolean)
      .map((ms, i) =>
        setTimeout(() => setState((s) => ({ ...s, step: Math.max(s.step, i + 1) })), Number(ms)),
      )
    return () => timers.forEach(clearTimeout)
  }, [activated, key, restartKey])
  return state.run === restartKey ? state.step : 0
}

/** Mezcla un color con transparencia respetando la paleta (--bx-primary, etc.). */
export const tint = (cssVar: string, percent: number) =>
  `color-mix(in srgb, var(${cssVar}) ${percent}%, transparent)`

export async function shareOrCopy(data: { title: string; text: string }) {
  const url = window.location.href
  if (navigator.share) {
    try {
      await navigator.share({ ...data, url })
      return 'shared' as const
    } catch {
      return 'cancelled' as const
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied' as const
  } catch {
    return 'failed' as const
  }
}
