/**
 * Los sonidos de la Ribbly: efectos cortos sintetizados con Web Audio (no hay
 * archivos que bajar). Acompañan las animaciones sin tapar nada: bajitos,
 * breves y afinados entre sí (todo en do mayor pentatónica, así los que se
 * encadenan suenan a melodía y no a ruido).
 *
 * Los navegadores no dejan sonar nada hasta que la persona toca la página:
 * el contexto de audio se crea y se reanuda con ese primer toque
 * (`armSound`, `primeSound`). Antes de eso, `playSound` no hace nada (no
 * se acumulan sonidos para cuando se habilite).
 */

export type Cue =
  /** Botón que se hunde. */
  | 'tap'
  /** Algo que aparece con resorte (logos, stickers, polaroids). Seguidos, suben de nota. */
  | 'pop'
  /** Pasar de pantalla. */
  | 'swish'
  /** Confeti que estalla. */
  | 'sparkle'
  /** Soplar las velitas. */
  | 'blow'
  /** Papel: un sobre, una tapa de revista, una tarjeta que entra. */
  | 'paper'
  /** La tarjeta que se despliega. */
  | 'unfold'
  /** La carta que se va escribiendo (lápiz, muy suave). Dura `duration`. */
  | 'scribble'
  /** Un acento chiquito (la firma, un deseo guardado). */
  | 'ting'
  | 'success'
  | 'miss'
  /** Premio: trofeo, jackpot, el final. */
  | 'fanfare'
  /** Perdió (cariñoso, no castiga). */
  | 'aww'
  /** El telón que se abre. */
  | 'curtain'
  /** La entrada VIP que entra girando. */
  | 'ticket'
  | 'lever'
  /** Rodillos girando (tic tic que frena). Dura `duration`. */
  | 'spin'
  /** Un rodillo que frena. `step` sube la nota. */
  | 'clunk'
  /** Sello de goma. */
  | 'stamp'
  /** Una nota pegada (los deseos). `step` es su lugar en la melodía. */
  | 'note'
  | 'whoosh'
  /** La carta que cae al frasco. */
  | 'drop'
  /** Golpe a la piñata. `step` es el número de golpe. */
  | 'thud'
  /** La piñata que se rompe. */
  | 'smash'
  | 'heart'
  /** Aviso que sube desde abajo. */
  | 'sheet'
  | 'firework'
  /** El vale que gira al abrirse. */
  | 'flip'
  /** Una caja de regalo que se abre. */
  | 'unbox'

export interface CueOptions {
  /** Lugar en una secuencia (sube la nota). */
  step?: number
  /** Para los que duran (`scribble`, `spin`), en segundos. */
  duration?: number
  /** Más fuerte o más suave que lo normal (1 = normal). */
  gain?: number
}

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
let noiseBuffer: AudioBuffer | null = null

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

// ── Piezas de síntesis ──────────────────────────────────────────────────────

/** Do mayor pentatónica: los sonidos en secuencia suben por acá. */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
const C5 = 523.25
const pitch = (step: number, base = C5) =>
  base * 2 ** (PENTA[Math.max(0, Math.min(step, PENTA.length - 1))]! / 12)

function noise(ac: BaseAudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/** Envolvente: sube en `attack` y se apaga en `decay` (exponencial, suena natural). */
function envelope(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

interface Voice {
  ac: BaseAudioContext
  bus: GainNode
  t: number
  /** Multiplicador de volumen de este sonido. */
  k: number
}

function tone(
  v: Voice,
  {
    at = 0,
    f,
    to,
    glide,
    type = 'sine',
    gain,
    attack = 0.004,
    decay,
  }: {
    at?: number
    f: number
    to?: number
    glide?: number
    type?: OscillatorType
    gain: number
    attack?: number
    decay: number
  },
) {
  const { ac, bus } = v
  const t = v.t + at
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(f, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + (glide ?? attack + decay))
  const g = ac.createGain()
  envelope(g, t, gain * v.k, attack, decay)
  osc.connect(g)
  g.connect(bus)
  osc.start(t)
  osc.stop(t + attack + decay + 0.05)
}

function hiss(
  v: Voice,
  {
    at = 0,
    filter = 'bandpass',
    f,
    to,
    q = 1,
    gain,
    attack = 0.008,
    decay,
  }: {
    at?: number
    filter?: BiquadFilterType
    f: number
    to?: number
    q?: number
    gain: number
    attack?: number
    decay: number
  },
) {
  const { ac, bus } = v
  const t = v.t + at
  const src = ac.createBufferSource()
  src.buffer = noise(ac)
  const biquad = ac.createBiquadFilter()
  biquad.type = filter
  biquad.Q.value = q
  biquad.frequency.setValueAtTime(f, t)
  if (to) biquad.frequency.exponentialRampToValueAtTime(to, t + attack + decay)
  const g = ac.createGain()
  envelope(g, t, gain * v.k, attack, decay)
  src.connect(biquad)
  biquad.connect(g)
  g.connect(bus)
  src.start(t, Math.random() * 0.6)
  src.stop(t + attack + decay + 0.05)
}

/** Brillitos: notas agudas sueltas, de a una, como chispas. */
function twinkle(v: Voice, at: number, count: number, gain = 0.03) {
  const notes = [16, 19, 21, 24, 26, 28]
  for (let i = 0; i < count; i++) {
    const n = notes[Math.floor(Math.random() * notes.length)]!
    tone(v, {
      at: at + i * 0.045 + Math.random() * 0.012,
      f: C5 * 2 ** (n / 12),
      gain: gain * (1 - i * 0.12),
      decay: 0.22 + Math.random() * 0.1,
    })
  }
}

/** Un roce de papel (dos granos de ruido agudo). */
function rustle(v: Voice, at = 0, gain = 0.085) {
  hiss(v, { at, f: 3400, q: 0.9, gain, decay: 0.12 })
  hiss(v, { at: at + 0.055, f: 2400, q: 1.1, gain: gain * 0.7, decay: 0.09 })
}

/** Un golpe grave y redondo. */
function knock(v: Voice, at: number, f: number, gain: number, decay = 0.14) {
  tone(v, { at, f, to: f * 0.5, glide: decay, gain, attack: 0.003, decay })
  hiss(v, { at, filter: 'lowpass', f: 1400, q: 0.5, gain: gain * 0.35, decay: 0.05 })
}

// ── Los sonidos ─────────────────────────────────────────────────────────────

type Synth = (v: Voice, opts: CueOptions) => void

/** Los `pop` seguidos (una cascada de polaroids) suben de nota. */
const popRun = { last: -1, step: 0 }

const SYNTHS: Record<Cue, Synth> = {
  tap(v) {
    tone(v, { f: 760, to: 430, glide: 0.05, gain: 0.11, attack: 0.002, decay: 0.06 })
    hiss(v, { filter: 'highpass', f: 4200, gain: 0.018, attack: 0.001, decay: 0.012 })
  },

  pop(v, { step }) {
    let s = step
    if (s === undefined) {
      s = v.t - popRun.last < 0.24 ? Math.min(popRun.step + 1, 7) : 0
      popRun.last = v.t
      popRun.step = s
    }
    const f = pitch(s, 587.33)
    tone(v, { f: f * 0.62, to: f * 1.3, glide: 0.045, gain: 0.12, attack: 0.003, decay: 0.09 })
    tone(v, { f: f * 2, gain: 0.018, attack: 0.003, decay: 0.07 })
  },

  swish(v) {
    hiss(v, { f: 520, to: 2300, q: 0.7, gain: 0.056, attack: 0.07, decay: 0.2 })
  },

  sparkle(v) {
    hiss(v, { filter: 'highpass', f: 2800, gain: 0.045, attack: 0.004, decay: 0.12 })
    tone(v, { f: 440, to: 990, glide: 0.04, gain: 0.07, attack: 0.003, decay: 0.07 })
    twinkle(v, 0.05, 5)
  },

  blow(v) {
    hiss(v, { filter: 'lowpass', f: 1900, to: 320, q: 0.4, gain: 0.16, attack: 0.07, decay: 0.55 })
    hiss(v, { at: 0.04, f: 900, to: 400, q: 0.6, gain: 0.05, attack: 0.05, decay: 0.4 })
    // Y el deseo, pedido.
    twinkle(v, 0.42, 4, 0.026)
  },

  paper(v) {
    rustle(v)
  },

  unfold(v) {
    rustle(v, 0, 0.07)
    rustle(v, 0.16, 0.055)
    tone(v, { at: 0.2, f: pitch(5), gain: 0.04, attack: 0.01, decay: 0.7 })
    tone(v, { at: 0.27, f: pitch(8), gain: 0.03, attack: 0.01, decay: 0.8 })
  },

  scribble(v, { duration = 2 }) {
    // Granitos de grafito con pausas desparejas, como una mano que escribe.
    let at = 0
    while (at < duration) {
      hiss(v, {
        at,
        f: 4200 + Math.random() * 2200,
        q: 2.2,
        gain: 0.012 + Math.random() * 0.01,
        attack: 0.006,
        decay: 0.035 + Math.random() * 0.04,
      })
      at += 0.06 + Math.random() * 0.07 + (Math.random() < 0.12 ? 0.14 : 0)
    }
  },

  ting(v, { step = 7 }) {
    tone(v, { f: pitch(step), gain: 0.06, attack: 0.004, decay: 0.4 })
    tone(v, { f: pitch(step) * 2, gain: 0.01, attack: 0.004, decay: 0.25 })
  },

  success(v) {
    ;[5, 7, 8].forEach((step, i) =>
      tone(v, { at: i * 0.075, f: pitch(step), type: 'triangle', gain: 0.06, decay: 0.3 }),
    )
    tone(v, { at: 0.15, f: pitch(10), gain: 0.022, attack: 0.01, decay: 0.6 })
  },

  miss(v) {
    tone(v, { f: 329.63, type: 'triangle', gain: 0.075, decay: 0.16 })
    tone(v, { at: 0.13, f: 261.63, to: 246.94, type: 'triangle', gain: 0.075, decay: 0.3 })
  },

  fanfare(v) {
    ;[0, 2, 3, 5, 7].forEach((step, i) =>
      tone(v, { at: i * 0.07, f: pitch(step), type: 'triangle', gain: 0.06, decay: 0.32 }),
    )
    ;[5, 7, 8].forEach((step) =>
      tone(v, { at: 0.36, f: pitch(step), gain: 0.024, attack: 0.02, decay: 1.1 }),
    )
    twinkle(v, 0.38, 4, 0.022)
  },

  aww(v) {
    tone(v, { f: 392, type: 'triangle', gain: 0.06, decay: 0.18 })
    tone(v, { at: 0.16, f: 329.63, type: 'triangle', gain: 0.055, decay: 0.2 })
    tone(v, { at: 0.32, f: 261.63, to: 233, type: 'triangle', gain: 0.055, decay: 0.42 })
  },

  curtain(v) {
    // Tela pesada que se corre: un susurro grave que crece y se va.
    hiss(v, { filter: 'lowpass', f: 260, to: 1100, q: 0.5, gain: 0.07, attack: 0.45, decay: 1.05 })
    hiss(v, { at: 0.2, f: 1400, to: 700, q: 0.6, gain: 0.02, attack: 0.3, decay: 0.9 })
  },

  ticket(v) {
    rustle(v, 0, 0.065)
    tone(v, { at: 0.12, f: pitch(9), gain: 0.04, decay: 0.35 })
  },

  lever(v) {
    for (let i = 0; i < 4; i++) hiss(v, { at: i * 0.045, f: 2600, q: 3, gain: 0.05, decay: 0.014 })
    knock(v, 0.24, 210, 0.065, 0.12)
  },

  spin(v, { duration = 2 }) {
    // Un tic por símbolo que pasa: rápido al principio, cada vez más lento.
    let at = 0
    let i = 0
    while (at < duration) {
      const progress = at / duration
      tone(v, {
        at,
        f: i % 2 ? 1500 : 1750,
        type: 'triangle',
        gain: 0.026,
        attack: 0.002,
        decay: 0.02,
      })
      at += 0.05 + progress * progress * 0.14
      i++
    }
  },

  clunk(v, { step = 0 }) {
    knock(v, 0, 240 + step * 50, 0.12, 0.11)
    tone(v, { at: 0.01, f: pitch(step * 2 + 3), gain: 0.03, decay: 0.15 })
  },

  stamp(v) {
    knock(v, 0, 165, 0.2, 0.15)
    hiss(v, { filter: 'lowpass', f: 2200, q: 0.4, gain: 0.05, attack: 0.002, decay: 0.07 })
  },

  note(v, { step = 0 }) {
    tone(v, { f: pitch(step), type: 'triangle', gain: 0.07, attack: 0.004, decay: 0.18 })
    hiss(v, { filter: 'highpass', f: 2600, gain: 0.016, attack: 0.002, decay: 0.03 })
  },

  whoosh(v) {
    hiss(v, { f: 1900, to: 480, q: 0.8, gain: 0.055, attack: 0.05, decay: 0.32 })
  },

  drop(v) {
    hiss(v, { f: 1900, to: 480, q: 0.8, gain: 0.05, attack: 0.05, decay: 0.32 })
    // Vidrio: dos parciales que no son armónicos (por eso suena a frasco).
    tone(v, { at: 0.4, f: 1568, gain: 0.04, attack: 0.002, decay: 0.55 })
    tone(v, { at: 0.4, f: 2489, gain: 0.016, attack: 0.002, decay: 0.35 })
  },

  thud(v, { step = 0 }) {
    knock(v, 0, 118 + step * 14, 0.19, 0.16)
    hiss(v, { f: 1100, q: 0.8, gain: 0.06, attack: 0.003, decay: 0.08 })
  },

  smash(v) {
    knock(v, 0, 105, 0.22, 0.28)
    hiss(v, { f: 1500, to: 700, q: 0.7, gain: 0.1, attack: 0.004, decay: 0.32 })
    // Caramelos que caen.
    for (let i = 0; i < 6; i++) {
      tone(v, {
        at: 0.1 + i * 0.07 + Math.random() * 0.03,
        f: 1400 + Math.random() * 1100,
        gain: 0.025,
        attack: 0.002,
        decay: 0.04,
      })
    }
    twinkle(v, 0.28, 4, 0.025)
  },

  heart(v) {
    tone(v, { f: 620, to: 1320, glide: 0.06, gain: 0.09, attack: 0.003, decay: 0.09 })
    tone(v, { at: 0.07, f: pitch(9), gain: 0.035, decay: 0.4 })
  },

  sheet(v) {
    hiss(v, { f: 700, to: 1700, q: 0.7, gain: 0.05, attack: 0.05, decay: 0.18 })
  },

  firework(v) {
    knock(v, 0, 90, 0.08, 0.22)
    for (let i = 0; i < 9; i++) {
      hiss(v, {
        at: 0.08 + Math.random() * 0.5,
        filter: 'highpass',
        f: 4500,
        gain: 0.014,
        attack: 0.001,
        decay: 0.015,
      })
    }
  },

  flip(v) {
    rustle(v, 0, 0.065)
    rustle(v, 0.14, 0.05)
    tone(v, { at: 0.05, f: pitch(0), to: pitch(5), glide: 0.3, gain: 0.03, decay: 0.35 })
  },

  unbox(v) {
    tone(v, { f: 300, to: 720, glide: 0.06, gain: 0.13, attack: 0.003, decay: 0.12 })
    hiss(v, { filter: 'highpass', f: 2600, gain: 0.04, attack: 0.004, decay: 0.14 })
    twinkle(v, 0.08, 5)
    ;[5, 8, 10].forEach((step) =>
      tone(v, { at: 0.16, f: pitch(step), gain: 0.022, attack: 0.02, decay: 1.1 }),
    )
  },
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
  sparkle: 0.12,
  note: 0.04,
  blow: 0.6,
  unfold: 0.6,
  smash: 0.6,
  unbox: 0.6,
  fanfare: 0.6,
  drop: 0.5,
  success: 0.3,
  miss: 0.3,
  flip: 0.3,
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
