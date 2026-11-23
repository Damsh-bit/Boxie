import { musicOutput } from './sound'

/**
 * La música de fondo de la Ribbly de cumpleaños: el "Cumpleaños feliz" (de
 * dominio público) en una cajita musical, como un vals lento, con un bajo y
 * acordes suaves; después, ocho compases que arpegian los mismos acordes para
 * que la vuelta no canse. Todo sintetizado y bajito: acompaña, no protagoniza
 * (y baja sola cuando suena un momento importante, ver `duck` en sound.ts).
 *
 * Se programa de a poco con el reloj del audio (no con timers), así no se
 * atrasa aunque la página esté ocupada.
 */

const BPM = 88
const BEAT = 60 / BPM
/** Volumen de la música: de fondo, por debajo de los efectos. */
const LEVEL = 0.28
/** Una vuelta: 16 compases de 3/4. */
const LOOP = 48

type Part = 'melody' | 'arp' | 'bass' | 'pah' | 'pad'
interface Note {
  beat: number
  part: Part
  midi: number[]
  beats: number
}

const CHORDS = {
  C: { pah: [60, 64, 67], bass: 48, arp: [72, 76, 79, 84] },
  G7: { pah: [59, 62, 65], bass: 43, arp: [71, 74, 77, 79] },
  C7: { pah: [58, 64, 67], bass: 48, arp: [70, 72, 76, 79] },
  F: { pah: [60, 65, 69], bass: 41, arp: [69, 72, 77, 81] },
} as const
type Chord = keyof typeof CHORDS

/** El acorde de cada tiempo de los ocho compases (se repiten en la variación). */
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

/** La melodía: [tiempo, nota MIDI, duración en tiempos]. El "Que los" final es el comienzo. */
const MELODY: [number, number, number][] = [
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
  [47, 67, 0.75],
  [47.75, 67, 0.25],
]

function buildScore(): Note[] {
  const notes: Note[] = MELODY.map(([beat, midi, beats]) => ({
    beat,
    part: 'melody',
    midi: [midi],
    beats,
  }))
  HARMONY.forEach((bar, b) => {
    // Primera mitad: vals (bajo y "pa-pá"). Segunda: bajo, colchón y arpegio.
    const a = b * 3
    const v = 24 + b * 3
    notes.push({ beat: a, part: 'bass', midi: [CHORDS[bar[0]!].bass], beats: 1 })
    notes.push({ beat: a + 1, part: 'pah', midi: [...CHORDS[bar[1]!].pah], beats: 1 })
    notes.push({ beat: a + 2, part: 'pah', midi: [...CHORDS[bar[2]!].pah], beats: 1 })
    notes.push({ beat: v, part: 'bass', midi: [CHORDS[bar[0]!].bass], beats: 1 })
    notes.push({ beat: v, part: 'pad', midi: [...CHORDS[bar[0]!].pah], beats: 3 })
    if (b === 7) {
      // Cierra en una nota larga y vuelve a empezar.
      notes.push({ beat: v, part: 'arp', midi: [84], beats: 2 })
      return
    }
    const pattern = b % 2 ? [3, 2, 1, 2, 3, 1] : [0, 1, 2, 3, 2, 1]
    pattern.forEach((index, i) => {
      if (b % 2 && i === 5) return
      const chord = CHORDS[bar[Math.floor(i / 2)]!]
      notes.push({ beat: v + i * 0.5, part: 'arp', midi: [chord.arp[index]!], beats: 0.5 })
    })
  })
  return notes.sort((x, y) => x.beat - y.beat)
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
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  osc.connect(g)
  g.connect(dest)
  osc.start(t)
  osc.stop(t + attack + decay + 0.05)
}

/** Cajita musical: la púa de metal, con su parcial agudo que brilla y se apaga rápido. */
function musicBox(ac: BaseAudioContext, dest: AudioNode, t: number, midi: number, gain: number) {
  const f = mtof(midi)
  partial(ac, dest, t, f, gain, 1.5)
  partial(ac, dest, t, f * 2, gain * 0.16, 0.45)
  partial(ac, dest, t, f * 4.2, gain * 0.06, 0.12)
}

function lowpass(ac: BaseAudioContext, dest: AudioNode, f: number) {
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = f
  filter.connect(dest)
  return filter
}

export function playNote(ac: BaseAudioContext, dest: AudioNode, note: Note, t: number) {
  const seconds = note.beats * BEAT
  switch (note.part) {
    case 'melody':
      musicBox(ac, dest, t, note.midi[0]!, 0.06)
      break
    case 'arp':
      musicBox(ac, dest, t, note.midi[0]!, 0.034)
      break
    case 'bass':
      partial(ac, dest, t, mtof(note.midi[0]!), 0.06, 0.7, 'sine', 0.008)
      partial(ac, dest, t, mtof(note.midi[0]!) * 2, 0.014, 0.25, 'triangle', 0.008)
      break
    case 'pah': {
      const soft = lowpass(ac, dest, 1500)
      for (const midi of note.midi) partial(ac, soft, t, mtof(midi), 0.013, 0.28, 'triangle', 0.006)
      break
    }
    case 'pad': {
      // Un colchón tibio: sierras desafinadas apenas, muy filtradas.
      const soft = lowpass(ac, dest, 700)
      const env = ac.createGain()
      env.gain.setValueAtTime(0, t)
      env.gain.linearRampToValueAtTime(1, t + 0.5)
      env.gain.setValueAtTime(1, t + seconds)
      env.gain.linearRampToValueAtTime(0, t + seconds + 0.6)
      env.connect(soft)
      for (const midi of note.midi) {
        for (const cents of [-7, 7]) {
          const osc = ac.createOscillator()
          osc.type = 'sawtooth'
          osc.frequency.value = mtof(midi)
          osc.detune.value = cents
          const g = ac.createGain()
          g.gain.value = 0.0045
          osc.connect(g)
          g.connect(env)
          osc.start(t)
          osc.stop(t + seconds + 0.7)
        }
      }
      break
    }
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
    // El levare (tiempo 47 de la vuelta anterior) suena enseguida.
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
