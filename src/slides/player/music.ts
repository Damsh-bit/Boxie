import { musicOutput } from './sound'

/**
 * La música de fondo de la Ribbly de cumpleaños: un vals de fiesta, alegre y
 * saltarín, con el "Cumpleaños feliz" (de dominio público) en una marimba.
 * Bombo en el 1, palmas en el 2 y el 3, shaker, acordes cortitos y un bajo
 * que salta. Cuatro partes para que la vuelta no canse: la canción, un riff
 * propio, la canción con glockenspiel y el riff con otro ritmo. Todo
 * sintetizado y bajito: acompaña, no protagoniza (y baja sola cuando suena un
 * momento importante, ver `duck` en sound.ts).
 *
 * Se programa de a poco con el reloj del audio (no con timers), así no se
 * atrasa aunque la página esté ocupada.
 */

const BPM = 138
const BEAT = 60 / BPM
/** Volumen de la música: de fondo, por debajo de los efectos. */
const LEVEL = 0.28
/** Una vuelta: 32 compases de 3/4 (cuatro partes de ocho). */
const LOOP = 96

type Part = 'melody' | 'glock' | 'riff' | 'bass' | 'pah' | 'kick' | 'clap' | 'shaker'
interface Note {
  beat: number
  part: Part
  midi: number[]
  beats: number
}

const CHORDS = {
  C: { pah: [60, 64, 67], bass: [48, 55], riff: [72, 76, 79, 84] },
  G7: { pah: [59, 62, 65], bass: [43, 50], riff: [71, 74, 77, 79] },
  C7: { pah: [58, 64, 67], bass: [48, 55], riff: [70, 72, 76, 79] },
  F: { pah: [60, 65, 69], bass: [41, 48], riff: [69, 72, 77, 81] },
} as const
type Chord = keyof typeof CHORDS

/** El acorde de cada tiempo de los ocho compases (las cuatro partes los repiten). */
const HARMONY: Chord[][] = [
  ['C', 'C', 'C'],
  ['G7', 'G7', 'G7'],
  ['G7', 'G7', 'G7'],
  ['C', 'C', 'C'],
  ['C7', 'C7', 'C7'],
  ['F', 'F', 'F'],
  ['C', 'C', 'G7'],
  ['C', 'C', 'C'],
]

/** La canción: [tiempo, nota MIDI, duración en tiempos], en ocho compases. */
const SONG: [number, number, number][] = [
  [0, 69, 1],
  [1, 67, 1],
  [2, 72, 1],
  [3, 71, 2],
  [5, 67, 0.75],
  [5.75, 67, 0.25],
  [6, 69, 1],
  [7, 67, 1],
  [8, 74, 1],
  [9, 72, 2],
  [11, 67, 0.75],
  [11.75, 67, 0.25],
  [12, 79, 1],
  [13, 76, 1],
  [14, 72, 1],
  [15, 71, 1],
  [16, 69, 1],
  [17, 77, 0.75],
  [17.75, 77, 0.25],
  [18, 76, 1],
  [19, 72, 1],
  [20, 74, 1],
  [21, 72, 3],
]
/** El "Que los" que da pie a la canción (el levare, en el último tiempo de la parte anterior). */
const PICKUP: [number, number, number][] = [
  [-1, 67, 0.75],
  [-0.25, 67, 0.25],
]

/**
 * El riff: por compás, seis corcheas con la nota del acorde que toca (0 a 3,
 * de grave a agudo) o un silencio (-1). Dos ritmos que se alternan.
 */
const RIFFS = {
  bounce: [
    [0, -1, 1, 2, -1, 1],
    [2, 1, -1, 3, -1, 2],
  ],
  offbeat: [
    [-1, 0, 1, -1, 2, 1],
    [3, -1, 2, 1, -1, 0],
  ],
}

function buildScore(): Note[] {
  const notes: Note[] = []
  const add = (beat: number, part: Part, midi: number[], beats = 1) =>
    notes.push({ beat, part, midi, beats })

  // La canción en la primera y la tercera parte (la tercera, con glockenspiel).
  for (const [start, glock] of [
    [0, false],
    [48, true],
  ] as const) {
    for (const [beat, midi, beats] of [...PICKUP, ...SONG]) {
      add(start + beat, 'melody', [midi], beats)
      if (glock) add(start + beat, 'glock', [midi + 12], beats)
    }
  }

  // El riff en la segunda y la cuarta parte.
  for (const [start, riff] of [
    [24, RIFFS.bounce],
    [72, RIFFS.offbeat],
  ] as const) {
    HARMONY.forEach((bar, b) => {
      const at = start + b * 3
      if (b === 7) {
        // Cierra arriba y deja lugar para el "Que los" de la parte siguiente.
        add(at, 'riff', [CHORDS[bar[0]!].riff[0]!], 1)
        add(at + 1, 'riff', [CHORDS[bar[0]!].riff[3]!], 1)
        return
      }
      riff[b % 2]!.forEach((index, i) => {
        if (index < 0) return
        add(at + i * 0.5, 'riff', [CHORDS[bar[Math.floor(i / 2)]!].riff[index]!], 0.5)
      })
    })
  }

  // El acompañamiento: bajo, "pa-pá", bombo, palmas y shaker, en los 32 compases.
  for (let section = 0; section < 4; section++) {
    // La primera vuelta de la canción va más liviana (sin palmas ni bajo que salta).
    const full = section > 0
    HARMONY.forEach((bar, b) => {
      const at = section * 24 + b * 3
      add(at, 'bass', [CHORDS[bar[0]!].bass[0]!])
      if (full) add(at + 2.5, 'bass', [CHORDS[bar[2]!].bass[1]!], 0.5)
      add(at + 1, 'pah', [...CHORDS[bar[1]!].pah])
      add(at + 2, 'pah', [...CHORDS[bar[2]!].pah])
      add(at, 'kick', [])
      if (full) {
        add(at + 1, 'clap', [])
        add(at + 2, 'clap', [])
      }
      for (let i = 0; i < 6; i++) add(at + i * 0.5, 'shaker', [i % 2], 0.5)
    })
  }

  // El levare de la primera parte suena al final de la vuelta.
  return notes
    .map((n) => (n.beat < 0 ? { ...n, beat: n.beat + LOOP } : n))
    .sort((x, y) => x.beat - y.beat)
}

const SCORE = buildScore()
/** Arranca por el "Que los" (el levare antes del primer compás). */
const FIRST = SCORE.findIndex((n) => n.beat >= LOOP - 1)

// ── Instrumentos ────────────────────────────────────────────────────────────

const mtof = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

function partial(
  ac: BaseAudioContext,
  dest: AudioNode,
  t: number,
  f: number,
  gain: number,
  decay: number,
  type: OscillatorType = 'sine',
  attack = 0.003,
) {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = f
  const g = ac.createGain()
  // En silencio desde ya: si no, el cuadro antes de `t` suena entero (un clic).
  g.gain.value = 0.0001
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  osc.connect(g)
  g.connect(dest)
  osc.start(t)
  osc.stop(t + attack + decay + 0.05)
}

let whiteNoise: AudioBuffer | null = null
function noise(ac: BaseAudioContext): AudioBuffer {
  if (!whiteNoise || whiteNoise.sampleRate !== ac.sampleRate) {
    whiteNoise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = whiteNoise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return whiteNoise
}

/** Un golpe de ruido filtrado (palmas, shaker). */
function burst(
  ac: BaseAudioContext,
  dest: AudioNode,
  t: number,
  type: BiquadFilterType,
  f: number,
  gain: number,
  decay: number,
) {
  const src = ac.createBufferSource()
  src.buffer = noise(ac)
  const filter = ac.createBiquadFilter()
  filter.type = type
  filter.frequency.value = f
  filter.Q.value = 0.9
  const g = ac.createGain()
  // En silencio desde ya: si no, el cuadro antes de `t` suena entero (un clic).
  g.gain.value = 0.0001
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.002 + decay)
  src.connect(filter)
  filter.connect(g)
  g.connect(dest)
  src.start(t, Math.random() * 0.8)
  src.stop(t + decay + 0.05)
}

/** Marimba: la tabla de madera, con su parcial agudo que golpea y se apaga enseguida. */
function marimba(ac: BaseAudioContext, dest: AudioNode, t: number, midi: number, gain: number) {
  const f = mtof(midi)
  partial(ac, dest, t, f, gain, 0.5, 'sine', 0.002)
  partial(ac, dest, t, f * 3.93, gain * 0.14, 0.06, 'sine', 0.001)
  partial(ac, dest, t, f * 2, gain * 0.08, 0.18, 'sine', 0.002)
}

/** Glockenspiel: chapitas de metal que brillan. */
function glock(ac: BaseAudioContext, dest: AudioNode, t: number, midi: number, gain: number) {
  const f = mtof(midi)
  partial(ac, dest, t, f, gain, 0.9, 'sine', 0.001)
  partial(ac, dest, t, f * 2.76, gain * 0.18, 0.22, 'sine', 0.001)
}

function lowpass(ac: BaseAudioContext, dest: AudioNode, f: number) {
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = f
  filter.connect(dest)
  return filter
}

export function playNote(ac: BaseAudioContext, dest: AudioNode, note: Note, t: number) {
  switch (note.part) {
    case 'melody':
      marimba(ac, dest, t, note.midi[0]!, 0.07)
      break
    case 'glock':
      glock(ac, dest, t, note.midi[0]!, 0.022)
      break
    case 'riff':
      marimba(ac, dest, t, note.midi[0]!, 0.05)
      break
    case 'bass': {
      const f = mtof(note.midi[0]!)
      partial(ac, dest, t, f, 0.055, 0.26, 'triangle', 0.004)
      partial(ac, dest, t, f, 0.05, 0.3, 'sine', 0.004)
      break
    }
    case 'pah': {
      // Acordes cortitos, con resorte: el "pa-pá" del vals.
      const soft = lowpass(ac, dest, 2400)
      for (const midi of note.midi) partial(ac, soft, t, mtof(midi), 0.014, 0.1, 'triangle', 0.003)
      break
    }
    case 'kick':
      // Bombo blandito: se siente más de lo que se oye.
      {
        const osc = ac.createOscillator()
        osc.frequency.setValueAtTime(130, t)
        osc.frequency.exponentialRampToValueAtTime(48, t + 0.1)
        const g = ac.createGain()
        g.gain.value = 0.0001
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.08, t + 0.004)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
        osc.connect(g)
        g.connect(dest)
        osc.start(t)
        osc.stop(t + 0.2)
      }
      break
    case 'clap':
      // Palmas: tres chasquidos casi juntos y la cola.
      for (const at of [0, 0.009, 0.018]) burst(ac, dest, t + at, 'bandpass', 1500, 0.03, 0.012)
      burst(ac, dest, t + 0.02, 'bandpass', 1300, 0.02, 0.07)
      break
    case 'shaker':
      // En los contratiempos, un poquito más fuerte: eso es lo que hace bailar.
      burst(ac, dest, t, 'bandpass', 7500, note.midi[0] ? 0.012 : 0.007, 0.03)
      break
  }
}

// ── El reproductor ──────────────────────────────────────────────────────────

let wanted = false
let timer: number | undefined
let run: { gain: GainNode; origin: number; index: number; loop: number } | null = null

function fadeOut() {
  if (!run) return
  const { gain } = run
  run = null
  const now = gain.context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.8)
  window.setTimeout(() => gain.disconnect(), 1500)
}

/** Programa lo que viene en el próximo tercio de segundo (o se calla si no hay audio). */
function tick() {
  const output = wanted ? musicOutput() : null
  if (!output) {
    // Sin sonido, con la pestaña oculta o porque ya no se quiere: se apaga despacio.
    fadeOut()
    if (!wanted && timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
    return
  }
  const { ac, input } = output
  if (!run) {
    const gain = ac.createGain()
    const now = ac.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(LEVEL, now + 3)
    gain.connect(input)
    // El levare (último tiempo de la vuelta anterior) suena enseguida.
    run = { gain, origin: now + 0.2 + BEAT, index: FIRST, loop: -1 }
  }
  const horizon = ac.currentTime + 0.35
  for (;;) {
    const note = SCORE[run.index]!
    const at = run.origin + (run.loop * LOOP + note.beat) * BEAT
    if (at > horizon) break
    if (at > ac.currentTime) playNote(ac, run.gain, note, at)
    run.index++
    if (run.index === SCORE.length) {
      run.index = 0
      run.loop++
    }
  }
}

/**
 * Prende la música (entra despacio apenas el audio está habilitado; si se
 * silencia o se oculta la pestaña, se calla y vuelve a empezar después).
 * Devuelve cómo apagarla.
 */
export function startMusic(): () => void {
  if (typeof window === 'undefined') return () => {}
  wanted = true
  if (timer === undefined) timer = window.setInterval(tick, 90)
  tick()
  return () => {
    wanted = false
    tick()
  }
}

/** Para medir y probar: la partitura de una vuelta. */
export const musicScore = { notes: SCORE, beat: BEAT, loop: LOOP }
