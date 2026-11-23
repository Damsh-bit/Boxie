/**
 * El motor de sonido de la Ribbly: el contexto de audio, la preferencia de
 * silencio y `playSound`. Cómo suena cada cosa está en sound-synths.ts; la
 * música de fondo, en music.ts.
 *
 * Los navegadores no dejan sonar nada hasta que la persona toca la página:
 * el contexto de audio se crea y se reanuda con ese primer toque
 * (`armSound`, `primeSound`). Antes de eso, `playSound` no hace nada (no
 * se acumulan sonidos para cuando se habilite).
 */

import { SYNTHS, type Cue, type CueOptions } from './sound-synths'

export type { Cue, CueOptions }

type Stop = () => void
const noop: Stop = () => {}

/** Volumen general: bajo a propósito. */
const MASTER = 0.5

// ── Preferencia: con o sin sonido ───────────────────────────────────────────

const PREF_KEY = 'ribbly:sonido'
let mutedPref: boolean | null = null
const prefListeners = new Set<() => void>()

export function isMuted(): boolean {
  if (mutedPref === null) {
    mutedPref = false
    try {
      mutedPref = window.localStorage.getItem(PREF_KEY) === 'off'
    } catch {
      // Sin almacenamiento: con sonido.
    }
  }
  return mutedPref
}

export function setMuted(muted: boolean) {
  mutedPref = muted
  try {
    window.localStorage.setItem(PREF_KEY, muted ? 'off' : 'on')
  } catch {
    // Queda en memoria.
  }
  if (muted && out && ctx) out.gain.setTargetAtTime(0, ctx.currentTime, 0.02)
  if (!muted && out && ctx) out.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.02)
  prefListeners.forEach((listener) => listener())
}

export function subscribeMuted(listener: () => void) {
  prefListeners.add(listener)
  return () => {
    prefListeners.delete(listener)
  }
}

// ── El contexto de audio ────────────────────────────────────────────────────

let ctx: AudioContext | null = null
let out: GainNode | null = null
/** Por acá entra la música: baja sola cuando suena un momento importante. */
let musicBus: GainNode | null = null

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }
type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string }
  userActivation?: { hasBeenActive: boolean }
}

function createContext(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const Context = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
  if (!Context) return null
  try {
    // iOS: que conviva con la música de quien la escucha y respete el modo silencio.
    const nav = navigator as AudioSessionNavigator
    if (nav.audioSession) nav.audioSession.type = 'ambient'
  } catch {
    // Opcional.
  }
  try {
    ctx = new Context({ latencyHint: 'interactive' })
  } catch {
    return null
  }
  // Un compresor suave: aunque se encimen varios, nunca saturan.
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -20
  compressor.knee.value = 14
  compressor.ratio.value = 4
  compressor.attack.value = 0.003
  compressor.release.value = 0.2
  out = ctx.createGain()
  out.gain.value = isMuted() ? 0 : MASTER
  out.connect(compressor)
  compressor.connect(ctx.destination)
  musicBus = ctx.createGain()
  musicBus.connect(out)
  return ctx
}

/**
 * Habilita el audio. Tiene que llamarse dentro de un toque (o tecla): es lo
 * único que los navegadores aceptan para empezar a sonar.
 */
export function primeSound(): Promise<void> {
  const ac = createContext()
  if (!ac) return Promise.resolve()
  const resumed = ac.state === 'running' ? Promise.resolve() : ac.resume().catch(() => {})
  // Safari viejo: además hay que hacer sonar algo dentro del toque.
  try {
    const silence = ac.createBufferSource()
    silence.buffer = ac.createBuffer(1, 1, 22050)
    silence.connect(ac.destination)
    silence.start(0)
  } catch {
    // Opcional.
  }
  return resumed
}

const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const
let armed = 0

function unlock() {
  if (ctx?.state === 'running') return
  void primeSound()
}

/**
 * Escucha los toques de la página para habilitar el audio con el primero (y
 * reanudarlo si el sistema lo suspendió, p. ej. después de una llamada).
 * Devuelve cómo dejar de escuchar.
 */
export function armSound(): () => void {
  if (typeof window === 'undefined') return noop
  if (armed++ === 0) {
    for (const event of UNLOCK_EVENTS) {
      window.addEventListener(event, unlock, { capture: true, passive: true })
    }
  }
  return () => {
    if (--armed === 0) {
      for (const event of UNLOCK_EVENTS) {
        window.removeEventListener(event, unlock, { capture: true })
      }
    }
  }
}

function ready(): AudioContext | null {
  if (typeof window === 'undefined' || isMuted()) return null
  if (document.visibilityState === 'hidden') return null
  // Si ya tocó la página (navegó sin recargar), se puede crear acá mismo.
  if (!ctx && (navigator as AudioSessionNavigator).userActivation?.hasBeenActive) createContext()
  if (!ctx || ctx.state !== 'running' || !out) return null
  return ctx
}

/**
 * El audio listo para la música: habilitado, con sonido y la pestaña a la
 * vista. Devuelve el contexto y la entrada de la música.
 */
export function musicOutput(): { ac: AudioContext; input: AudioNode } | null {
  const ac = ready()
  return ac && musicBus ? { ac, input: musicBus } : null
}

/**
 * Lo mínimo entre dos iguales (en segundos): que nunca se amontonen. Los de un
 * momento único (romper, soplar, abrir) no se repiten aunque llegue un toque
 * de más mientras su botón todavía se está yendo.
 */
const MIN_GAP: Partial<Record<Cue, number>> = {
  tap: 0.05,
  pop: 0.055,
  swish: 0.12,
  note: 0.04,
  photo: 0.05,
  tape: 0.04,
  scratch: 0.045,
  tick: 0.05,
  blow: 0.6,
  unfold: 0.6,
  smash: 0.6,
  unbox: 0.6,
  fanfare: 0.6,
  coins: 0.6,
  horn: 0.5,
  drop: 0.5,
  peel: 0.5,
  success: 0.3,
  miss: 0.3,
  flip: 0.3,
}

/** Los momentos importantes: mientras suenan, la música baja. */
const DUCK = new Set<Cue>([
  'blow',
  'unfold',
  'success',
  'miss',
  'fanfare',
  'aww',
  'smash',
  'unbox',
  'coins',
  'horn',
  'stamp',
  'drop',
  'pencil',
  'signature',
])

function duck(ac: AudioContext, seconds: number) {
  if (!musicBus) return
  const g = musicBus.gain
  const now = ac.currentTime
  g.cancelScheduledValues(now)
  g.setValueAtTime(g.value, now)
  g.setTargetAtTime(0.35, now, 0.04)
  g.setTargetAtTime(1, now + seconds, 0.35)
}
const lastPlayed = new Map<Cue, number>()
/** Cuántos sonidos arrancaron en los últimos 300 ms: con demasiados, se omite el resto. */
const recent: number[] = []

/**
 * Hace sonar un efecto. Sin audio habilitado, con el sonido apagado o con la
 * pestaña oculta, no hace nada. Devuelve cómo cortarlo (para los que duran).
 */
export function playSound(cue: Cue, opts: CueOptions = {}): Stop {
  const ac = ready()
  if (!ac || !out) return noop
  const now = ac.currentTime
  const gap = MIN_GAP[cue] ?? 0.08
  if (now - (lastPlayed.get(cue) ?? -1) < gap) return noop
  while (recent.length && now - recent[0]! > 0.3) recent.shift()
  if (recent.length >= 8) return noop
  lastPlayed.set(cue, now)
  recent.push(now)
  if (DUCK.has(cue)) duck(ac, Math.max(0.6, opts.duration ?? 0))

  const bus = ac.createGain()
  bus.connect(out)
  try {
    SYNTHS[cue]({ ac, bus, t: now + 0.005, k: opts.gain ?? 1 }, opts)
  } catch {
    bus.disconnect()
    return noop
  }
  // Libera el bus cuando terminó (los más largos duran unos 2,5 s).
  const life = (opts.duration ?? 0) + 2
  const release = window.setTimeout(() => bus.disconnect(), life * 1000)
  return () => {
    window.clearTimeout(release)
    bus.gain.setTargetAtTime(0, ac.currentTime, 0.03)
    window.setTimeout(() => bus.disconnect(), 250)
  }
}

/** Qué temáticas suenan: por ahora, la de cumpleaños (la que abre con la torta). */
export function themeSounds(config: { slides: readonly { kind: string }[] }): boolean {
  return config.slides.some((s) => s.kind === 'cover.cake')
}
