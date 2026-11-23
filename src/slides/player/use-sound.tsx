'use client'

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  armSound,
  isMuted,
  playSound,
  setMuted,
  subscribeMuted,
  type Cue,
  type CueOptions,
} from './sound'

/**
 * Los sonidos dentro del player. Fuera de un player que suene (la vidriera de
 * la portada, el editor directo, las temáticas sin sonido) todo queda mudo:
 * las slides llaman a `useSound` igual y no pasa nada.
 */

type Play = (cue: Cue, opts?: CueOptions) => () => void

const silent: Play = () => () => {}
const SoundContext = createContext<Play>(silent)

export function SoundProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  useEffect(() => (enabled ? armSound() : undefined), [enabled])
  return (
    <SoundContext.Provider value={enabled ? playSound : silent}>{children}</SoundContext.Provider>
  )
}

/** Para hacer sonar algo desde un evento (un toque, el fin de una animación). */
export function useSound(): Play {
  return useContext(SoundContext)
}

/**
 * Un sonido que acompaña una animación: suena `delay` segundos después de que
 * `when` pasa a true (la slide quedó en pantalla, apareció el premio). Si
 * `when` vuelve a false antes, no suena; si vuelve a true, suena de nuevo.
 */
export function useCue(when: boolean, cue: Cue | null | false, delay = 0, opts?: CueOptions) {
  const play = useSound()
  const { step, duration, gain } = opts ?? {}
  useEffect(() => {
    if (!when || !cue) return
    let stop = () => {}
    const timer = window.setTimeout(() => {
      stop = play(cue, { step, duration, gain })
    }, delay * 1000)
    return () => {
      window.clearTimeout(timer)
      // Los que duran (la carta que se escribe, los rodillos) se cortan si se va.
      if (duration) stop()
    }
  }, [when, cue, delay, play, step, duration, gain])
}

/** `useCue` como componente: para lo que se monta (una vista nueva, cada nota de una lista). */
export function SoundCue({
  when = true,
  cue,
  delay = 0,
  ...opts
}: { when?: boolean; cue: Cue; delay?: number } & CueOptions) {
  useCue(when, cue, delay, opts)
  return null
}

/** Con o sin sonido (lo que eligió quien mira; queda guardado en su dispositivo). */
export function useMuted(): [boolean, (muted: boolean) => void] {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false)
  return useMemo(() => [muted, setMuted], [muted])
}
