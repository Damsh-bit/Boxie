/**
 * Cómo suena cada cosa. Todo sintetizado (no hay archivos): los objetos con
 * ruido moldeado muestra por muestra (el grafito de un lápiz, una hoja que se
 * da vuelta, una cinta que se pega, los pochoclos), lo musical con notas
 * afinadas en do mayor pentatónica. Cada elemento tiene su sonido: el papel
 * que se escribe suena a lápiz, la revista a página, la cámara a obturador.
 */

export type Cue =
  // ── Interfaz ──
  /** Botón que se hunde. */
  | 'tap'
  /** Pasar de pantalla. */
  | 'swish'
  /** Aviso que sube desde abajo. */
  | 'sheet'
  /** Algo que aparece con resorte (el logo, el nombre). Seguidos, suben de nota. */
  | 'pop'
  /** Una campanita (el saludo, la pista de la trivia). `step` es la nota. */
  | 'chime'
  // ── Papel ──
  /** Papel que se desliza sobre la mesa (el sobre, la hoja de la cápsula). */
  | 'slide'
  /** El sticker del sobre que se despega. */
  | 'peel'
  /** La tarjeta de cartulina que se abre. */
  | 'unfold'
  /** Lápiz escribiendo: trazos de grafito. Dura `duration`. */
  | 'pencil'
  /** Un trazo corto de lápiz (cada letra que se escribe). */
  | 'scratch'
  /** La firma: un garabato rápido. */
  | 'signature'
  /** Una página de revista que se da vuelta. */
  | 'pageflip'
  /** Un papel que pasa rápido (otra foto, una tarjeta que sale). */
  | 'flick'
  /** Cinta adhesiva que pega una nota. `step` sube un poquito la nota. */
  | 'tape'
  /** Un sticker que se pega. */
  | 'sticker'
  /** Un papelito que se dobla (cada deseo de las velitas). `step` sube la nota. */
  | 'fold'
  /** El vale que gira al abrirse. */
  | 'flip'
  /** La entrada VIP que entra. */
  | 'ticket'
  /** Sello de goma. */
  | 'stamp'
  // ── Fotos ──
  /** Una polaroid que cae sobre la mesa (cada una un poco distinta). */
  | 'photo'
  /** Obturador de cámara (una foto que se agranda). */
  | 'shutter'
  // ── Fiesta ──
  /** Soplar las velitas (y las llamas que se apagan). */
  | 'blow'
  /** Confeti que cae (lluvia de papelitos). */
  | 'confetti'
  /** Espantasuegras. */
  | 'horn'
  /** Fuegos artificiales. */
  | 'firework'
  /** Una caja de regalo: la cinta, la tapa y la magia. */
  | 'unbox'
  /** Fanfarria de premio. */
  | 'fanfare'
  // ── Juegos ──
  | 'success'
  | 'miss'
  /** Perdió (cariñoso, no castiga). */
  | 'aww'
  /** La palanca de la tragamonedas. */
  | 'lever'
  /** Rodillos girando (tic tic que frena). Dura `duration`. */
  | 'spin'
  /** Un rodillo que frena. `step` sube la nota. */
  | 'clunk'
  /** Monedas que caen (jackpot). */
  | 'coins'
  /** Golpe a la piñata (el palo y el cartón). `step` es el número de golpe. */
  | 'thwack'
  /** La piñata que se rompe y llueven caramelos. */
  | 'smash'
  /** Contador que suma (los números del resumen). `step` sube la nota. */
  | 'tick'
  // ── Cine y música ──
  /** El telón de terciopelo que se corre. */
  | 'curtain'
  /** Pochoclos que explotan. */
  | 'popcorn'
  /** Una gaseosa que se abre y burbujea. */
  | 'fizz'
  /** Papel de caramelo que cruje. */
  | 'wrapper'
  /** Proyector que pasa a la diapositiva siguiente. */
  | 'projector'
  /** La púa que cae en el vinilo. */
  | 'vinyl'
  /** Un cassette que entra en el pasacasete. */
  | 'cassette'
  // ── Otros ──
  /** Una nota de xilofón (tocar los deseos). `step` es la nota. */
  | 'note'
  /** Me gusta. */
  | 'heart'
  /** Algo que baja volando. */
  | 'whoosh'
  /** La carta que se dobla y cae al frasco de vidrio. */
  | 'drop'

export interface CueOptions {
  /** Lugar en una secuencia (sube la nota). */
  step?: number
  /** Para los que duran (`pencil`, `spin`), en segundos. */
  duration?: number
  /** Más fuerte o más suave que lo normal (1 = normal). */
  gain?: number
}

export interface Voice {
  ac: BaseAudioContext
  bus: AudioNode
  t: number
  /** Multiplicador de volumen de este sonido. */
  k: number
}

// ── Notas ───────────────────────────────────────────────────────────────────

/** Do mayor pentatónica: los sonidos en secuencia suben por acá. */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
const C5 = 523.25
export const pitch = (step: number, base = C5) =>
  base * 2 ** (PENTA[Math.max(0, Math.min(step, PENTA.length - 1))]! / 12)

const rnd = () => Math.random() * 2 - 1
const between = (a: number, b: number) => a + Math.random() * (b - a)

// ── Piezas ──────────────────────────────────────────────────────────────────

let whiteNoise: AudioBuffer | null = null
function noise(ac: BaseAudioContext): AudioBuffer {
  if (!whiteNoise || whiteNoise.sampleRate !== ac.sampleRate) {
    whiteNoise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = whiteNoise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = rnd()
  }
  return whiteNoise
}

/** Envolvente: sube en `attack` y se apaga en `decay` (exponencial, suena natural). */
function adsr(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

interface ToneSpec {
  at?: number
  f: number
  to?: number
  glide?: number
  type?: OscillatorType
  gain: number
  attack?: number
  decay: number
}

export function tone(
  v: Voice,
  { at = 0, f, to, glide, type = 'sine', gain, attack = 0.004, decay }: ToneSpec,
) {
  const { ac, bus } = v
  const t = v.t + at
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(f, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + (glide ?? attack + decay))
  const g = ac.createGain()
  adsr(g, t, gain * v.k, attack, decay)
  osc.connect(g)
  g.connect(bus)
  osc.start(t)
  osc.stop(t + attack + decay + 0.05)
}

interface HissSpec {
  at?: number
  filter?: BiquadFilterType
  f: number
  to?: number
  q?: number
  gain: number
  attack?: number
  decay: number
}

/** Ruido filtrado con envolvente: aire, roces, golpes. */
function hiss(
  v: Voice,
  { at = 0, filter = 'bandpass', f, to, q = 1, gain, attack = 0.008, decay }: HissSpec,
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
  adsr(g, t, gain * v.k, attack, decay)
  src.connect(biquad)
  biquad.connect(g)
  g.connect(bus)
  src.start(t, Math.random() * 0.6)
  src.stop(t + attack + decay + 0.05)
}

/** Un sonido armado muestra por muestra (las texturas: grafito, papel, burbujas). */
function texture(
  ac: BaseAudioContext,
  seconds: number,
  fill: (d: Float32Array, sr: number) => void,
) {
  const sr = ac.sampleRate
  const buffer = ac.createBuffer(1, Math.max(1, Math.ceil(seconds * sr)), sr)
  fill(buffer.getChannelData(0), sr)
  return buffer
}

/** Chasquidos sueltos (papel que cruje, cinta, burbujas): `rate(u)` por segundo, u de 0 a 1. */
function crackle(
  d: Float32Array,
  sr: number,
  start: number,
  end: number,
  rate: (u: number) => number,
  amp: number,
) {
  const i0 = Math.floor(start * sr)
  const i1 = Math.min(d.length, Math.floor(end * sr))
  for (let i = i0; i < i1; i++) {
    const u = (i - i0) / Math.max(1, i1 - i0)
    if (Math.random() >= rate(u) / sr) continue
    const a = amp * between(0.35, 1) * (Math.random() < 0.5 ? -1 : 1)
    const len = 5 + Math.floor(Math.random() * 20)
    for (let k = 0; k < len && i + k < d.length; k++) {
      d[i + k]! += a * Math.exp((-3 * k) / len) * (k % 2 ? -0.7 : 1)
    }
  }
}

/** Ruido con una forma de volumen `shape(u)` (u de 0 a 1) entre `start` y `end`. */
function rush(
  d: Float32Array,
  sr: number,
  start: number,
  end: number,
  shape: (u: number) => number,
  amp: number,
) {
  const i0 = Math.floor(start * sr)
  const i1 = Math.min(d.length, Math.floor(end * sr))
  for (let i = i0; i < i1; i++) d[i]! += rnd() * amp * shape((i - i0) / Math.max(1, i1 - i0))
}

/** Suena una textura a través de filtros. Devuelve los filtros (para moverlos). */
function play(
  v: Voice,
  buffer: AudioBuffer,
  {
    at = 0,
    gain,
    filters = [],
  }: {
    at?: number
    gain: number
    filters?: { type: BiquadFilterType; f: number; q?: number; to?: number }[]
  },
): BiquadFilterNode[] {
  const { ac } = v
  const t = v.t + at
  const src = ac.createBufferSource()
  src.buffer = buffer
  let node: AudioNode = src
  const made = filters.map(({ type, f, q = 0.7, to }) => {
    const biquad = ac.createBiquadFilter()
    biquad.type = type
    biquad.Q.value = q
    biquad.frequency.setValueAtTime(f, t)
    if (to) biquad.frequency.exponentialRampToValueAtTime(to, t + buffer.duration)
    node.connect(biquad)
    node = biquad
    return biquad
  })
  const g = ac.createGain()
  g.gain.value = gain * v.k
  node.connect(g)
  g.connect(v.bus)
  src.start(t)
  return made
}

/** Ventana suave (sube y baja como una campana). */
const bell = (u: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 2

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

/** Un golpe grave y redondo. */
function knock(v: Voice, at: number, f: number, gain: number, decay = 0.14) {
  tone(v, { at, f, to: f * 0.5, glide: decay, gain, attack: 0.003, decay })
  hiss(v, { at, filter: 'lowpass', f: 1400, q: 0.5, gain: gain * 0.35, decay: 0.05 })
}

/** Un clic mecánico (plástico o metal), con un resonar cortito. */
function click(v: Voice, at: number, f: number, gain: number) {
  hiss(v, { at, f, q: 1.5, gain, attack: 0.001, decay: 0.008 })
  tone(v, { at, f: f * 0.55, gain: gain * 0.3, attack: 0.001, decay: 0.016 })
}

/**
 * Lápiz sobre papel: trazos de grafito con presión que varía, pausas entre
 * trazos (y entre palabras) y cada trazo con su "color" (la dirección cambia
 * el roce).
 */
function pencil(
  v: Voice,
  duration: number,
  { at = 0, gain = 1, quick = false }: { at?: number; gain?: number; quick?: boolean } = {},
) {
  const strokes: { start: number; len: number }[] = []
  let t = 0.005
  while (t < duration - 0.03) {
    const len = Math.min(quick ? between(0.035, 0.09) : between(0.06, 0.2), duration - t)
    strokes.push({ start: t, len })
    t +=
      len +
      (quick ? between(0.01, 0.03) : between(0.025, 0.08)) +
      (!quick && Math.random() < 0.14 ? between(0.12, 0.26) : 0)
  }
  const buffer = texture(v.ac, duration + 0.03, (d, sr) => {
    for (const s of strokes) {
      const i0 = Math.floor(s.start * sr)
      const n = Math.floor(s.len * sr)
      let press = 0.7
      let target = 0.7
      for (let k = 0; k < n && i0 + k < d.length; k++) {
        if (k % 220 === 0) target = between(0.45, 1)
        press += (target - press) * 0.006
        const local = k / sr
        const env = Math.min(1, local / 0.009) * Math.min(1, (s.len - local) / 0.018)
        let x = rnd() * env * press
        // Granitos de grafito que raspan.
        if (Math.random() < 0.007) x += rnd() * 1.5 * env
        d[i0 + k] = x
      }
    }
  })
  const [, band] = play(v, buffer, {
    at,
    gain: gain * 0.058,
    filters: [
      { type: 'highpass', f: 1100, q: 0.5 },
      { type: 'bandpass', f: 3400, q: 0.75 },
    ],
  })
  for (const s of strokes) band!.frequency.setValueAtTime(between(2400, 5200), v.t + at + s.start)
}

// ── Los sonidos ─────────────────────────────────────────────────────────────

type Synth = (v: Voice, opts: CueOptions) => void

/** Los `pop` (y los `tick`) seguidos suben de nota. */
const popRun = { last: -1, step: 0 }
const tickRun = { last: -1, step: 0 }

export const SYNTHS: Record<Cue, Synth> = {
  // ── Interfaz ──

  tap(v) {
    tone(v, { f: 760, to: 430, glide: 0.05, gain: 0.11, attack: 0.002, decay: 0.06 })
    hiss(v, { filter: 'highpass', f: 4200, gain: 0.018, attack: 0.001, decay: 0.012 })
  },

  swish(v) {
    hiss(v, { f: 520, to: 2300, q: 0.7, gain: 0.056, attack: 0.07, decay: 0.2 })
  },

  sheet(v) {
    hiss(v, { f: 700, to: 1700, q: 0.7, gain: 0.05, attack: 0.05, decay: 0.18 })
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

  chime(v, { step = 7 }) {
    // Campanita: un parcial inarmónico le da el brillo de metal.
    tone(v, { f: pitch(step), gain: 0.038, attack: 0.003, decay: 0.9 })
    tone(v, { f: pitch(step) * 2.76, gain: 0.012, attack: 0.002, decay: 0.3 })
    tone(v, { at: 0.09, f: pitch(step + 2), gain: 0.026, attack: 0.003, decay: 0.8 })
  },

  // ── Papel ──

  slide(v) {
    const buffer = texture(v.ac, 0.34, (d, sr) => {
      rush(d, sr, 0, 0.3, bell, 1)
      crackle(d, sr, 0.03, 0.28, () => 60, 0.25)
    })
    play(v, buffer, {
      gain: 0.05,
      filters: [
        { type: 'highpass', f: 380 },
        { type: 'lowpass', f: 2800, to: 1400 },
      ],
    })
    // Y se apoya.
    hiss(v, { at: 0.29, filter: 'lowpass', f: 520, gain: 0.05, attack: 0.003, decay: 0.045 })
  },

  peel(v) {
    const buffer = texture(v.ac, 0.21, (d, sr) => {
      rush(d, sr, 0, 0.2, (u) => 0.12 * (1 - u * 0.5), 1)
      crackle(d, sr, 0, 0.2, (u) => 250 + 2400 * u * u, 0.9)
    })
    play(v, buffer, { gain: 0.14, filters: [{ type: 'bandpass', f: 3300, q: 0.7 }] })
    tone(v, { at: 0.2, f: 900, to: 480, glide: 0.03, gain: 0.05, attack: 0.002, decay: 0.035 })
  },

  unfold(v) {
    // La cartulina cruje al abrirse y la hoja se asienta.
    const buffer = texture(v.ac, 0.34, (d, sr) => {
      for (const at of [0, 0.09, 0.19]) {
        crackle(d, sr, at, at + 0.05, () => 1600, 0.8)
        rush(d, sr, at, at + 0.05, bell, 0.18)
      }
    })
    play(v, buffer, { gain: 0.15, filters: [{ type: 'bandpass', f: 2600, q: 0.6 }] })
    hiss(v, { at: 0.27, filter: 'lowpass', f: 430, q: 0.5, gain: 0.09, attack: 0.01, decay: 0.11 })
  },

  pencil(v, { duration = 2 }) {
    pencil(v, duration)
  },

  scratch(v) {
    pencil(v, between(0.05, 0.1), { gain: 1.5, quick: true })
  },

  signature(v) {
    // Garabato rápido: trazos cortos y veloces, y el punto final.
    pencil(v, 0.42, { gain: 1, quick: true })
    hiss(v, { at: 0.46, f: 3600, q: 1.2, gain: 0.05, attack: 0.002, decay: 0.012 })
  },

  pageflip(v) {
    const buffer = texture(v.ac, 0.44, (d, sr) => {
      let phase = 0
      for (let i = 0; i < d.length; i++) {
        const u = i / d.length
        const rise = Math.min(1, i / sr / 0.07)
        const fall = u > 0.68 ? Math.max(0, 1 - (u - 0.68) / 0.32) : 1
        // La hoja aletea y se va calmando.
        phase += (42 - 30 * u) / sr
        const flutter = 0.5 + 0.5 * Math.abs(Math.sin(Math.PI * phase))
        d[i] = rnd() * rise * fall * fall * flutter
      }
      crackle(d, sr, 0, 0.3, (u) => 160 * (1 - u), 0.6)
    })
    play(v, buffer, { gain: 0.062, filters: [{ type: 'bandpass', f: 1300, to: 3400, q: 0.6 }] })
    hiss(v, { at: 0.38, filter: 'lowpass', f: 600, q: 0.5, gain: 0.07, attack: 0.004, decay: 0.06 })
  },

  flick(v) {
    hiss(v, { f: 2400, to: 4600, q: 0.8, gain: 0.1, attack: 0.012, decay: 0.07 })
    hiss(v, { at: 0.07, filter: 'lowpass', f: 900, gain: 0.04, attack: 0.002, decay: 0.03 })
  },

  tape(v, { step = 0 }) {
    // Cinta: el pegote que cruje y la palmadita que la asienta.
    const buffer = texture(v.ac, 0.07, (d, sr) => {
      crackle(d, sr, 0, 0.06, () => 2600, 0.9)
      rush(d, sr, 0, 0.06, (u) => 0.2 * (1 - u), 1)
    })
    play(v, buffer, { gain: 0.034, filters: [{ type: 'highpass', f: 2600 + step * 120, q: 0.6 }] })
    hiss(v, { at: 0.06, filter: 'lowpass', f: 850, gain: 0.05, attack: 0.002, decay: 0.025 })
    tone(v, { at: 0.06, f: pitch(step), type: 'triangle', gain: 0.022, decay: 0.16 })
  },

  sticker(v) {
    const buffer = texture(v.ac, 0.08, (d, sr) => {
      crackle(d, sr, 0, 0.075, (u) => 600 + 2000 * u, 0.8)
    })
    play(v, buffer, { gain: 0.18, filters: [{ type: 'bandpass', f: 3600, q: 0.7 }] })
    hiss(v, { at: 0.09, filter: 'lowpass', f: 650, gain: 0.08, attack: 0.002, decay: 0.03 })
    tone(v, { at: 0.09, f: 210, to: 150, gain: 0.05, attack: 0.002, decay: 0.03 })
  },

  fold(v, { step = 0 }) {
    // Un pliegue: dos crujidos secos, el dedo que marca y una notita.
    const buffer = texture(v.ac, 0.12, (d, sr) => {
      crackle(d, sr, 0, 0.035, () => 2200, 0.85)
      crackle(d, sr, 0.07, 0.1, () => 2200, 0.7)
    })
    play(v, buffer, { gain: 0.17, filters: [{ type: 'bandpass', f: 3000, q: 0.6 }] })
    hiss(v, { at: 0.11, filter: 'lowpass', f: 520, gain: 0.06, attack: 0.003, decay: 0.04 })
    tone(v, { at: 0.12, f: pitch(step + 4), gain: 0.03, decay: 0.35 })
  },

  flip(v) {
    hiss(v, { f: 3400, q: 0.9, gain: 0.07, decay: 0.12 })
    hiss(v, { at: 0.13, f: 2400, q: 1.1, gain: 0.05, decay: 0.09 })
    tone(v, { at: 0.05, f: pitch(0), to: pitch(5), glide: 0.3, gain: 0.03, decay: 0.35 })
  },

  ticket(v) {
    hiss(v, { f: 2800, to: 4200, q: 0.9, gain: 0.06, attack: 0.01, decay: 0.08 })
    tone(v, { at: 0.12, f: pitch(9), gain: 0.04, decay: 0.35 })
  },

  stamp(v) {
    knock(v, 0, 165, 0.2, 0.15)
    hiss(v, { filter: 'lowpass', f: 2200, q: 0.4, gain: 0.05, attack: 0.002, decay: 0.07 })
  },

  // ── Fotos ──

  photo(v) {
    // Cada polaroid cae un poco distinta.
    const k = between(0.85, 1.15)
    hiss(v, { f: 1100 * k, q: 0.7, gain: 0.18, attack: 0.002, decay: 0.045 })
    hiss(v, { filter: 'highpass', f: 3800, gain: 0.03, attack: 0.001, decay: 0.006 })
    tone(v, { f: 170 * k, to: 120 * k, gain: 0.09, attack: 0.002, decay: 0.035 })
  },

  shutter(v) {
    // Abre y cierra: dos clics mecánicos y el resorte.
    click(v, 0, 4200, 0.12)
    click(v, 0.055, 2600, 0.1)
    hiss(v, { at: 0.06, filter: 'lowpass', f: 900, gain: 0.04, attack: 0.002, decay: 0.03 })
  },

  // ── Fiesta ──

  blow(v) {
    hiss(v, { filter: 'lowpass', f: 1900, to: 320, q: 0.4, gain: 0.16, attack: 0.07, decay: 0.55 })
    hiss(v, { at: 0.04, f: 900, to: 400, q: 0.6, gain: 0.05, attack: 0.05, decay: 0.4 })
    // Cada llamita que se apaga.
    for (let i = 0; i < 3; i++) {
      hiss(v, { at: 0.22 + i * 0.07, filter: 'lowpass', f: 700, gain: 0.03, decay: 0.05 })
    }
    // Y el deseo, pedido.
    twinkle(v, 0.45, 4, 0.024)
  },

  confetti(v) {
    // Un soplido y la lluvia de papelitos que cae.
    hiss(v, { filter: 'lowpass', f: 1300, gain: 0.05, attack: 0.004, decay: 0.05 })
    const buffer = texture(v.ac, 0.75, (d, sr) => {
      crackle(d, sr, 0.03, 0.75, (u) => 900 * (1 - u) ** 2, 0.55)
    })
    play(v, buffer, { gain: 0.064, filters: [{ type: 'highpass', f: 3000, q: 0.5 }] })
    twinkle(v, 0.06, 2, 0.018)
  },

  horn(v) {
    // Espantasuegras: un zumbido de lengüeta que se desenrolla.
    const { ac } = v
    const t = v.t
    const osc = ac.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(300, t)
    osc.frequency.exponentialRampToValueAtTime(370, t + 0.07)
    osc.frequency.setValueAtTime(370, t + 0.36)
    osc.frequency.exponentialRampToValueAtTime(330, t + 0.5)
    const buzz = ac.createOscillator()
    buzz.frequency.value = 27
    const depth = ac.createGain()
    depth.gain.value = 0.45
    const amp = ac.createGain()
    amp.gain.value = 0.55
    buzz.connect(depth)
    depth.connect(amp.gain)
    const band = ac.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1150
    band.Q.value = 1.3
    const g = ac.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.09 * v.k, t + 0.03)
    g.gain.setValueAtTime(0.09 * v.k, t + 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52)
    osc.connect(amp)
    amp.connect(band)
    band.connect(g)
    g.connect(v.bus)
    osc.start(t)
    buzz.start(t)
    osc.stop(t + 0.56)
    buzz.stop(t + 0.56)
    hiss(v, { filter: 'highpass', f: 2500, gain: 0.015, attack: 0.02, decay: 0.4 })
  },

  firework(v) {
    knock(v, 0, 72, 0.1, 0.32)
    hiss(v, { filter: 'lowpass', f: 320, gain: 0.05, attack: 0.004, decay: 0.3 })
    const buffer = texture(v.ac, 0.9, (d, sr) => {
      crackle(d, sr, 0.18, 0.9, (u) => 160 * (1 - u), 0.7)
    })
    play(v, buffer, { gain: 0.08, filters: [{ type: 'highpass', f: 2600 }] })
  },

  unbox(v) {
    // La cinta que se desata, la tapa que salta y la magia.
    hiss(v, { f: 2200, to: 4800, q: 2.4, gain: 0.035, attack: 0.12, decay: 0.16 })
    tone(v, { at: 0.24, f: 300, to: 720, glide: 0.06, gain: 0.075, attack: 0.003, decay: 0.12 })
    hiss(v, { at: 0.24, filter: 'highpass', f: 2600, gain: 0.035, attack: 0.004, decay: 0.12 })
    twinkle(v, 0.3, 5, 0.016)
    ;[5, 8, 10].forEach((step) =>
      tone(v, { at: 0.38, f: pitch(step), gain: 0.015, attack: 0.02, decay: 1.1 }),
    )
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

  // ── Juegos ──

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

  aww(v) {
    tone(v, { f: 392, type: 'triangle', gain: 0.06, decay: 0.18 })
    tone(v, { at: 0.16, f: 329.63, type: 'triangle', gain: 0.055, decay: 0.2 })
    tone(v, { at: 0.32, f: 261.63, to: 233, type: 'triangle', gain: 0.055, decay: 0.42 })
  },

  lever(v) {
    // Trinquete que baja y el tope.
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

  coins(v) {
    // Monedas que caen: metal con parciales inarmónicos, cada una distinta.
    for (let i = 0; i < 8; i++) {
      const at = 0.05 + i * 0.075 + Math.random() * 0.04
      const f = between(1900, 2900)
      const gain = 0.014 * between(0.6, 1)
      tone(v, { at, f, gain, attack: 0.001, decay: between(0.18, 0.32) })
      tone(v, { at, f: f * 2.41, gain: gain * 0.5, attack: 0.001, decay: 0.12 })
      tone(v, { at, f: f * 3.93, gain: gain * 0.3, attack: 0.001, decay: 0.07 })
      hiss(v, { at, filter: 'highpass', f: 5000, gain: 0.02, attack: 0.001, decay: 0.004 })
    }
    SYNTHS.fanfare({ ...v, t: v.t + 0.12 }, {})
  },

  thwack(v, { step = 0 }) {
    // El palo que zumba y el golpe en el cartón (cada vez un poco más agudo).
    hiss(v, { f: 700, to: 1900, q: 0.8, gain: 0.04, attack: 0.03, decay: 0.04 })
    knock(v, 0.06, 118 + step * 14, 0.11, 0.15)
    const buffer = texture(v.ac, 0.09, (d, sr) => {
      crackle(d, sr, 0, 0.08, (u) => 1800 * (1 - u), 0.9)
      rush(d, sr, 0, 0.05, (u) => 1 - u, 0.4)
    })
    play(v, buffer, { at: 0.06, gain: 0.1, filters: [{ type: 'bandpass', f: 1300, q: 0.7 }] })
  },

  smash(v) {
    knock(v, 0, 100, 0.22, 0.28)
    // El papel maché que se rompe.
    const crunch = texture(v.ac, 0.4, (d, sr) => {
      crackle(d, sr, 0, 0.38, (u) => 2600 * (1 - u), 1)
      rush(d, sr, 0, 0.15, (u) => 1 - u, 0.5)
    })
    play(v, crunch, { gain: 0.2, filters: [{ type: 'bandpass', f: 1500, to: 800, q: 0.6 }] })
    // Caramelos que caen y rebotan.
    for (let i = 0; i < 12; i++) {
      const at = between(0.15, 0.75)
      const f = between(2200, 4200)
      tone(v, { at, f, gain: 0.03, attack: 0.001, decay: 0.03 })
      tone(v, {
        at: at + between(0.07, 0.13),
        f: f * 1.02,
        gain: 0.014,
        attack: 0.001,
        decay: 0.02,
      })
    }
    twinkle(v, 0.3, 3, 0.02)
  },

  tick(v, { step }) {
    // Taquito de madera: el contador que suma (seguidos, suben de nota).
    let s = step
    if (s === undefined) {
      s = v.t - tickRun.last < 0.3 ? Math.min(tickRun.step + 1, 5) : 0
      tickRun.last = v.t
      tickRun.step = s
    }
    const f = pitch(s + 5)
    tone(v, { f, gain: 0.095, attack: 0.001, decay: 0.03 })
    tone(v, { f: f * 2.3, gain: 0.02, attack: 0.001, decay: 0.015 })
    hiss(v, { f: 2600, q: 1.2, gain: 0.03, attack: 0.001, decay: 0.006 })
  },

  // ── Cine y música ──

  curtain(v) {
    // Terciopelo pesado: un roce grave que crece, aletea un poco y se va.
    const buffer = texture(v.ac, 1.5, (d, sr) => {
      let phase = 0
      for (let i = 0; i < d.length; i++) {
        const u = i / d.length
        phase += 7 / sr
        d[i] = rnd() * bell(u) * (0.75 + 0.25 * Math.sin(2 * Math.PI * phase))
      }
    })
    play(v, buffer, {
      gain: 0.12,
      filters: [
        { type: 'lowpass', f: 300, to: 1000, q: 0.5 },
        { type: 'highpass', f: 90 },
      ],
    })
    hiss(v, { at: 0.2, f: 1400, to: 700, q: 0.6, gain: 0.018, attack: 0.3, decay: 0.9 })
  },

  popcorn(v) {
    for (let i = 0; i < 11; i++) {
      const at = between(0.02, 0.9) ** 1.3
      const f = between(900, 2600)
      hiss(v, {
        at,
        f,
        q: 1.2,
        gain: between(0.05, 0.1),
        attack: 0.001,
        decay: between(0.01, 0.02),
      })
      tone(v, { at, f: between(380, 800), gain: 0.03, attack: 0.001, decay: 0.012 })
    }
  },

  fizz(v) {
    // ¡Pssst! y las burbujas.
    hiss(v, { filter: 'highpass', f: 2600, gain: 0.07, attack: 0.004, decay: 0.16 })
    const buffer = texture(v.ac, 1, (d, sr) => {
      crackle(d, sr, 0.1, 1, (u) => 700 * (1 - u), 0.5)
    })
    play(v, buffer, { gain: 0.18, filters: [{ type: 'bandpass', f: 5200, q: 0.8 }] })
  },

  wrapper(v) {
    // Tres apretones al papel celofán.
    const buffer = texture(v.ac, 0.45, (d, sr) => {
      for (const at of [0, 0.14, 0.27]) crackle(d, sr, at, at + 0.11, (u) => 2800 * bell(u), 0.8)
    })
    play(v, buffer, { gain: 0.11, filters: [{ type: 'bandpass', f: 4200, q: 0.6 }] })
  },

  projector(v) {
    // Ka-chunk: el carro que se corre y la diapositiva que cae.
    click(v, 0, 2500, 0.06)
    hiss(v, { at: 0.01, filter: 'lowpass', f: 700, gain: 0.05, attack: 0.02, decay: 0.07 })
    knock(v, 0.1, 140, 0.06, 0.08)
    click(v, 0.1, 900, 0.055)
  },

  vinyl(v) {
    // La púa que apoya y el crepitar del disco.
    knock(v, 0, 90, 0.06, 0.06)
    click(v, 0, 3000, 0.05)
    const buffer = texture(v.ac, 1.1, (d, sr) => {
      rush(d, sr, 0, 1.1, (u) => 0.05 * (1 - u), 1)
      crackle(d, sr, 0.04, 1.1, (u) => 35 * (1 - u * 0.6), 1)
    })
    play(v, buffer, { gain: 0.16, filters: [{ type: 'lowpass', f: 3500 }] })
  },

  cassette(v) {
    // Clac-clac de plástico y el motorcito.
    click(v, 0, 2100, 0.09)
    click(v, 0.08, 1700, 0.08)
    tone(v, { at: 0.12, f: 62, type: 'sawtooth', gain: 0.012, attack: 0.03, decay: 0.3 })
  },

  // ── Otros ──

  note(v, { step = 0 }) {
    tone(v, { f: pitch(step), type: 'triangle', gain: 0.07, attack: 0.004, decay: 0.18 })
    hiss(v, { filter: 'highpass', f: 2600, gain: 0.016, attack: 0.002, decay: 0.03 })
  },

  heart(v) {
    tone(v, { f: 620, to: 1320, glide: 0.06, gain: 0.09, attack: 0.003, decay: 0.09 })
    tone(v, { at: 0.07, f: pitch(9), gain: 0.035, decay: 0.4 })
  },

  whoosh(v) {
    hiss(v, { f: 1900, to: 480, q: 0.8, gain: 0.055, attack: 0.05, decay: 0.32 })
  },

  drop(v) {
    SYNTHS.fold(v, { step: 2 })
    hiss(v, { at: 0.12, f: 1900, to: 480, q: 0.8, gain: 0.045, attack: 0.05, decay: 0.3 })
    // Vidrio: dos parciales que no son armónicos (por eso suena a frasco).
    tone(v, { at: 0.48, f: 1568, gain: 0.04, attack: 0.002, decay: 0.55 })
    tone(v, { at: 0.48, f: 2489, gain: 0.016, attack: 0.002, decay: 0.35 })
  },
}
